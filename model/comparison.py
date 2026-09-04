# ================================================
# مقارنة SMR مقابل الغاز الطبيعي - عبر سنة كاملة
# التوفير البيئي والاقتصادي
# ================================================
import pandas as pd
import matplotlib.pyplot as plt

# قراءة محاكاة السنة
df = pd.read_csv("year_simulation.csv")

# --- مدخلات خط الأساس الغازي ---
ccgt_eff = 0.55           # كفاءة الدورة المركبة (للمسار الكهربائي فقط)
boiler_eff = 0.90         # كفاءة مرجل غاز تقليدي (للمسار الحراري المباشر لـMSF)
gas_lhv = 13.9            # kWh/kg قيمة حرارية للغاز
co2_factor = 56.1         # kg CO2/GJ
smr_eff = 0.303

# نعيد حساب الحمل الكهربائي المكافئ لكل يوم (من نسبة الاستغلال) — يُستخدم
# فقط لحساب انبعاثات SMR أدناه (دورة حياة)، وليس لخط أساس الغاز بعد الإصلاح
units = 10
cap_per_unit = 100 / smr_eff
installed = units * cap_per_unit   # MWth-eq

# --- ثوابت فصل المسارين الحراري/الكهربائي لإعادة اشتقاق Q_th وP_el اليوميين ---
# year_simulation.csv لا يحفظ عمودي Q_th/P_el منفصلين، فقط "utilization"
# المُجمَّع. نشتقهما هنا من "water_mult" باستخدام نفس فيزياء model.py/
# simulation.py بالضبط: elec_mult = water_mult × 0.98 (نفس العلاقة الحرفية
# المستخدمة بـsimulation.py سطر 68 لتوليد year_simulation.csv أصلًا).
production_total = 1_036_000
msf_share, ro_share = 0.702, 0.298
ro_kwh, msf_aux_kwh, gor, steam_enthalpy = 4.0, 3.0, 10.0, 0.627

total_gas_kg = 0
total_co2_smr = 0
total_co2_gas = 0

daily_co2_saved = []

for _, row in df.iterrows():
    water_mult = row["water_mult"]
    elec_mult = round(water_mult * 0.98, 3)

    prod = production_total * water_mult
    msf_prod = prod * msf_share
    ro_prod = prod * ro_share

    q_th_mw = (msf_prod * (1000 / gor) * steam_enthalpy) / 24 / 1000          # MWth — حمل MSF الحراري
    p_el_mw = (ro_prod * ro_kwh + msf_prod * msf_aux_kwh) * elec_mult / 24 / 1000  # MWe — حمل RO+مساعد MSF

    # مسارا الغاز منفصلان: الحراري عبر مرجل (boiler_eff)، الكهربائي عبر
    # دورة مركبة (ccgt_eff) — بدل قسمة الحمل المُجمَّع (Q_th+كهرباء/smr_eff)
    # على ccgt_eff مرة ثانية، وهو ما كان يضخّم استهلاك الغاز بازدواج الكفاءة.
    gas_thermal_kwh = q_th_mw * 1000 * 24 / boiler_eff
    gas_electric_kwh = p_el_mw * 1000 * 24 / ccgt_eff
    gas_kg_day = (gas_thermal_kwh + gas_electric_kwh) / gas_lhv
    total_gas_kg += gas_kg_day

    # انبعاثات الغاز (طن CO2/يوم)
    gj_day = gas_kg_day * (gas_lhv * 3.6 / 1000)
    co2_gas_day = gj_day * co2_factor / 1000
    total_co2_gas += co2_gas_day

    # انبعاثات SMR (شبه صفر تشغيليًا، ناخذ 12 gCO2/kWh دورة حياة) — غير
    # متأثرة بإصلاح مساري الغاز، تبقى على أساس الحمل الحراري-المكافئ الكلي
    # المُسلَّم فعليًا من المفاعل (لا يوجد له مساران منفصلان بالكفاءة)
    total_load = row["utilization"] * installed   # MWth-eq لهذا اليوم
    co2_smr_day = (total_load * 24 * 1000) * 0.012 / 1000
    total_co2_smr += co2_smr_day
    daily_co2_saved.append(co2_gas_day - co2_smr_day)

# تحويل الغاز لبراميل نفط مكافئ (1 برميل ≈ 1700 kWh)
total_gas_kwh = total_gas_kg * gas_lhv
barrels_equiv = total_gas_kwh / 1700

print("=" * 60)
print("التوفير السنوي: SMR مقابل الغاز الطبيعي")
print("=" * 60)
print(f"استهلاك الغاز السنوي (لو بقينا على الغاز): {total_gas_kg/1_000_000:,.1f} ألف طن")
print(f"المكافئ النفطي: {barrels_equiv:,.0f} برميل نفط مكافئ/سنة")
print()
print(f"انبعاثات الغاز السنوية: {total_co2_gas:,.0f} طن CO₂")
print(f"انبعاثات SMR السنوية: {total_co2_smr:,.0f} طن CO₂")
print(f"✅ الانبعاثات الموفَّرة سنويًا: {total_co2_gas - total_co2_smr:,.0f} طن CO₂")
print(f"   نسبة التخفيض: {(1 - total_co2_smr/total_co2_gas)*100:.1f}%")

# --- رسم بياني للانبعاثات الموفرة عبر السنة ---
plt.figure(figsize=(12, 5))
plt.plot(df["day"], daily_co2_saved, color="#C0392B", linewidth=2)
plt.fill_between(df["day"], daily_co2_saved, alpha=0.2, color="#C0392B")
plt.xlabel("Day of Year")
plt.ylabel("CO₂ Saved (tonnes/day)")
plt.title("Daily CO₂ Emissions Avoided by SMR vs Natural Gas - Ras Al Khair")
plt.grid(True, alpha=0.3)
plt.tight_layout()
plt.savefig("co2_savings_plot.png", dpi=150, bbox_inches="tight")
print("\n✅ تم حفظ رسم الانبعاثات في co2_savings_plot.png")

# ================================================
# السيناريو الخامس (مقترح المشرف): مقارنة انبعاثات — توربين الضغط الخلفي
# ================================================
# ملاحظة: units_D أدناه يجب أن يطابق يدويًا القيمة التي يطبعها
# simulation.py ("عدد الوحدات المطلوبة") — نفس نمط المزامنة اليدوية
# المستخدم أعلاه لمتغير units؛ حدّثه إذا تغيّرت افتراضات pw_ratio.
units_D = 33
smr_eff_D = 0.303
cap_per_unit_D = 100 / smr_eff_D
installed_D = units_D * cap_per_unit_D   # MWth-eq

df_D = pd.read_csv("year_simulation_scenario_D.csv")

total_gas_kg_D = 0
total_co2_smr_D = 0
total_co2_gas_D = 0

for _, row in df_D.iterrows():
    # نفس تصحيح مسارَي الغاز المطبَّق بالحلقة الرئيسية أعلاه. year_simulation_
    # scenario_D.csv يحفظ "ro_demand_MWe" (P_el_desal الفعلي) لكن ليس Q_th
    # منفصلًا، فنشتقه هنا من water_mult بنفس فيزياء calc_D بـsimulation.py
    # (الحمل الحراري لـMSF لا يعتمد على مسار توليد الكهرباء الخاص بالسيناريو
    # الخامس — نفس صيغة GOR المستخدمة بكل السيناريوهات).
    water_mult_D = row["water_mult"]
    prod_D_row = production_total * water_mult_D
    msf_prod_D = prod_D_row * msf_share
    q_th_mw_D = (msf_prod_D * (1000 / gor) * steam_enthalpy) / 24 / 1000   # MWth
    p_el_mw_D = row["ro_demand_MWe"]   # P_el_desal الفعلي، وليس الكهرباء المولَّدة (الفائض غير موجَّه للتحلية)

    gas_thermal_kwh_D = q_th_mw_D * 1000 * 24 / boiler_eff
    gas_electric_kwh_D = p_el_mw_D * 1000 * 24 / ccgt_eff
    gas_kg_day_D = (gas_thermal_kwh_D + gas_electric_kwh_D) / gas_lhv
    total_gas_kg_D += gas_kg_day_D

    gj_day_D = gas_kg_day_D * (gas_lhv * 3.6 / 1000)
    co2_gas_day_D = gj_day_D * co2_factor / 1000
    total_co2_gas_D += co2_gas_day_D

    # انبعاثات SMR غير متأثرة بالإصلاح — تبقى على أساس الحمل الحراري-
    # المكافئ الكلي المُسلَّم فعليًا (يشمل توليد الفائض الكهربائي كامل)
    total_load_D = row["utilization"] * installed_D
    co2_smr_day_D = (total_load_D * 24 * 1000) * 0.012 / 1000
    total_co2_smr_D += co2_smr_day_D

print("\n" + "=" * 60)
print("السيناريو الخامس: توربين الضغط الخلفي التسلسلي — مقارنة الانبعاثات")
print("=" * 60)
print(f"عدد الوحدات: {units_D} (مقابل {units} بالتصميم المتوازي الحالي)")
print(f"انبعاثات الغاز السنوية (لو استُخدم بهذا الحجم): {total_co2_gas_D:,.0f} طن CO₂")
print(f"انبعاثات SMART100 السنوية: {total_co2_smr_D:,.0f} طن CO₂")
print(f"الانبعاثات الموفَّرة سنويًا: {total_co2_gas_D - total_co2_smr_D:,.0f} طن CO₂")
print(f"\nملاحظة: هذا الحجم الأكبر من الوحدات (33 مقابل 10) ناتج عن مطابقة")
print("النسبة التجريبية للطاقة-إلى-الماء الموثقة لمحطات الاستخراج الكبرى،")
print("وليس عن نقص كفاءة — الفائض الكهربائي الضخم (~2,000 MWe) يعكس دور")
print("محطات التوليد المزدوج الفعلية في تغذية الشبكة الوطنية، لا RO فقط.")
print("=" * 60)