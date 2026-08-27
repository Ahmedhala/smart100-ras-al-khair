# ================================================
# نموذج SMR - رأس الخير | نسخة Python
# ينفّذ نفس معادلات الإكسل المعتمد
# ================================================

# ==== 1) المدخلات والافتراضات ====
production_total = 1_036_000   # م³/يوم - إجمالي الإنتاج
msf_share = 0.702             # نسبة إنتاج MSF
ro_share = 0.298             # نسبة إنتاج RO

ro_kwh = 4.0                 # kWh/م³ - استهلاك RO الكهربائي
msf_aux_kwh = 3.0            # kWh/م³ - استهلاك MSF الكهربائي المساعد
gor = 10.0                  # معامل GOR لوحدات MSF
steam_enthalpy = 0.627      # kWh/kg - الحرارة الكامنة للبخار

smr_elec = 100.0            # ميجاواط كهربائي لكل وحدة SMR
smr_eff= 0.303

# ==== 1ب) مدخلات السيناريو الخامس (مقترح المشرف): توربين الضغط الخلفي ====
# نسبة الطاقة إلى الماء (Power-to-Water Ratio) لتوربينات الاستخراج
# التكثيفية القديمة بمحطات MSF السعودية المزدوجة (قبل 1982): موثقة
# بين 10.2-17.5 MW/MIGD (المصدر: Al-Mutaz, I.S. — "Characteristics
# of dual purpose MSF desalination plants", جامعة الملك سعود).
# توربينات الضغط الخلفي (المستخدمة فعليًا منذ 1983) تعطي نسبة طاقة-
# إلى-ماء أقل من هذا النطاق، لأنها مصمَّمة لإعطاء الأولوية للحرارة/
# الماء لا للكهرباء. القيمة أدناه تقدير هندسي تقريبي من داخل/قرب
# هذا النطاق الموثق، وليست رقمًا رسميًا محددًا لمحطة رأس الخير.
pw_ratio = 12          # MW/MIGD — الافتراض الأساسي المعتمد بالنموذج
pw_ratio_low = 10.2    # الطرف الأدنى الموثق (لتحليل الحساسية)
pw_ratio_high = 17.5   # الطرف الأعلى الموثق (لتحليل الحساسية)
migd_to_m3 = 4_546      # 1 MIGD (مليون جالون إمبراطوري/يوم) ≈ 4,546 م³/يوم

# ==== 2) دالة تحسب الأحمال لأي سيناريو ====
def calculate_scenario(water_mult, elec_mult):
    # الإنتاج الفعلي بهذا السيناريو
    production = production_total * water_mult

    # الحمل الحراري لـ MSF (MWth)
    msf_prod = production * msf_share
    steam_per_m3 = 1000 / gor
    thermal_mw = (msf_prod * steam_per_m3 * steam_enthalpy) / 24 / 1000

    # الحمل الكهربائي لـ RO + مساعد MSF (MWe)
    ro_prod = production * ro_share
    electric_mw = (ro_prod*ro_kwh + msf_prod*msf_aux_kwh)*elec_mult/24/1000

    # الحمل الحراري المكافئ الكلي (MWth-eq)
    total_thermal_eq = thermal_mw + electric_mw / smr_eff

    return production, thermal_mw, electric_mw, total_thermal_eq

# ==== 2ب) دالة السيناريو الخامس: توربين الضغط الخلفي التسلسلي ====
def calculate_scenario_D(water_mult):
    # البخار هنا يمر أولًا بتوربين الضغط الخلفي (فيولّد كهرباء "كمنتج
    # ثانوي") ثم يخرج بضغط أقل (لكنه لايزال حارًا) ليغذي MSF مباشرة —
    # بعكس المسارين المتوازيين المستقلين بالسيناريوهات الأربعة أعلاه.
    # فقط ماء MSF يمر بهذا المسار (مرجع Al-Mutaz خاص بمحطات MSF
    # المزدوجة الغرض تحديدًا)؛ RO يبقى تقنية منفصلة تستهلك الكهرباء
    # الناتجة، دون أن يكون جزءًا من مسار البخار نفسه.
    production = production_total * water_mult
    msf_prod = production * msf_share
    msf_prod_migd = msf_prod / migd_to_m3

    # الكهرباء "منتج ثانوي" لمرور البخار بتوربين الضغط الخلفي
    electric_mw = msf_prod_migd * pw_ratio

    # الحمل الحراري لـ MSF — نفس منهجية GOR بالسيناريوهات الحالية
    steam_per_m3 = 1000 / gor
    thermal_mw = (msf_prod * steam_per_m3 * steam_enthalpy) / 24 / 1000

    # الحمل الحراري المكافئ الكلي — نفس صيغة الجمع المستخدمة
    # بالسيناريوهات المتوازية، لضمان قابلية المقارنة المباشرة رغم
    # اختلاف الفيزياء الفعلية (تحليل تحفظي؛ راجع التوثيق بالموقع)
    total_thermal_eq = thermal_mw + electric_mw / smr_eff

    # هل الكهرباء "المنتج الثانوي" تكفي احتياج RO الفعلي من نفس الإنتاج؟
    ro_prod = production * ro_share
    ro_demand_mw = (ro_prod * ro_kwh + msf_prod * msf_aux_kwh) / 24 / 1000
    surplus_deficit_mw = electric_mw - ro_demand_mw

    return production, thermal_mw, electric_mw, total_thermal_eq, ro_demand_mw, surplus_deficit_mw

# ==== 3) السيناريوهات الأربعة ====
scenarios = {
    "عادي":            (1.00, 1.00),
    "طلب مرتفع (مياه)":  (1.20, 1.05),
    "طلب مرتفع (كهرباء)": (1.00, 1.20),
    "ذروة الطلب":       (1.30, 1.30),
}

print("=" * 60)
print("نتائج النموذج لكل سيناريو")
print("=" * 60)

peak_load = 0
for name, (wm, em) in scenarios.items():
    prod, th, el, total = calculate_scenario(wm, em)
    print(f"\n▶ {name}")
    print(f"   الإنتاج: {prod:,.0f} م³/يوم")
    print(f"   الحمل الحراري: {th:.1f} MWth")
    print(f"   الحمل الكهربائي: {el:.1f} MWe")
    print(f"   الحمل الحراري المكافئ الكلي: {total:.1f} MWth-eq")
    peak_load = max(peak_load, total)

# ==== 4) تحجيم SMR (من حمل الذروة) ====
import math
cap_per_unit = smr_elec / smr_eff          # السعة الحرارية المكافئة لكل وحدة
units_needed = math.ceil(peak_load / cap_per_unit)

print("\n" + "=" * 60)
print(f"حمل الذروة: {peak_load:.1f} MWth-eq")
print(f"السعة المكافئة لكل وحدة: {cap_per_unit:.1f} MWth-eq")
print(f"✅ عدد وحدات SMR المطلوبة: {units_needed}")
print("=" * 60)
# ================================================
# 5) الحسابات الاقتصادية والبيئية
# ================================================

# --- مدخلات إضافية ---
smr_cf = 0.92              # معامل القدرة (التوافر)
smr_capex_optimistic = 550   # مليون $ لكل وحدة (متفائل)
smr_capex_conservative = 1000 # مليون $ لكل وحدة (متحفظ)
smr_lcoe = 75             # $/MWh
discount_rate = 0.07      # معدل الخصم
project_life = 60         # سنة

# --- اختر السيناريو: "متفائل" أو "متحفظ" ---
capex_scenario = "متحفظ"
capex_per_unit = smr_capex_optimistic if capex_scenario == "متفائل" else smr_capex_conservative

# --- معامل استرداد رأس المال (CRF) ---
crf = (discount_rate * (1 + discount_rate)**project_life) / ((1 + discount_rate)**project_life - 1)

# --- التكلفة الرأسمالية ---
total_capex = units_needed * capex_per_unit          # مليون $
annual_capex = total_capex * crf                     # مليون $/سنة

# --- دالة تحسب LCOW لأي سيناريو ---
def calculate_lcow(production, total_thermal_eq):
    # التكلفة التشغيلية السنوية (مليون $) = الطاقة السنوية × LCOE
    annual_opex = (total_thermal_eq * 8760 * smr_cf) * smr_lcoe / 1_000_000
    # إجمالي التكلفة السنوية
    total_annual_cost = annual_capex + annual_opex
    # LCOW = التكلفة الكلية ÷ الإنتاج السنوي
    lcow = total_annual_cost * 1_000_000 / (production * 365)
    return lcow

print("\n" + "=" * 60)
print(f"الحسابات الاقتصادية (سيناريو التكلفة: {capex_scenario})")
print("=" * 60)
print(f"إجمالي التكلفة الرأسمالية: {total_capex:,.0f} مليون $")
print(f"التكلفة السنوية لرأس المال: {annual_capex:,.1f} مليون $/سنة")
print()

for name, (wm, em) in scenarios.items():
    prod, th, el, total = calculate_scenario(wm, em)
    lcow = calculate_lcow(prod, total)
    print(f"▶ {name}: LCOW = {lcow:.2f} $/م³")
# ================================================
# 6) توليد Dataset للـ AI
# ================================================
import csv

print("\n" + "=" * 60)
print("توليد بيانات المحاكاة (Dataset) للذكاء الاصطناعي...")
print("=" * 60)

rows = []
# نولّد توليفات: عامل الماء من 0.8 إلى 1.4، عامل الكهرباء من 0.8 إلى 1.4
water_factors = [round(0.8 + i*0.05, 2) for i in range(13)]   # 0.80 .. 1.40
elec_factors  = [round(0.8 + i*0.05, 2) for i in range(13)]   # 0.80 .. 1.40

for wf in water_factors:
    for ef in elec_factors:
        prod, th, el, total = calculate_scenario(wf, ef)
        lcow = calculate_lcow(prod, total)
        utilization = total / (units_needed * cap_per_unit)
        rows.append({
            "water_factor": wf,
            "elec_factor": ef,
            "production_m3_day": round(prod, 0),
            "thermal_MWth": round(th, 1),
            "electric_MWe": round(el, 1),
            "total_thermal_eq_MWth": round(total, 1),
            "utilization": round(utilization, 4),
            "LCOW_usd_m3": round(lcow, 3),
        })

# حفظ الملف
with open("dataset.csv", "w", newline="", encoding="utf-8-sig") as f:
    writer = csv.DictWriter(f, fieldnames=rows[0].keys())
    writer.writeheader()
    writer.writerows(rows)

print(f"✅ تم توليد {len(rows)} صف وحفظها في dataset.csv")
print(f"   عينة من أول صف: {rows[0]}")

# ================================================
# 7) السيناريو الخامس (مقترح المشرف): توربين الضغط الخلفي التسلسلي
# ================================================
print("\n" + "=" * 60)
print("السيناريو الخامس: توربين الضغط الخلفي التسلسلي (مقترح المشرف)")
print(f"افتراض نسبة الطاقة-إلى-الماء: {pw_ratio} MW/MIGD (تقدير هندسي)")
print("=" * 60)

peak_load_D = 0
scenario_D_results = {}
for name, (wm, em) in scenarios.items():
    prod_D, th_D, el_D, total_D, ro_demand_D, diff_D = calculate_scenario_D(wm)
    scenario_D_results[name] = (prod_D, th_D, el_D, total_D, ro_demand_D, diff_D)
    status = "فائض" if diff_D >= 0 else "عجز"
    print(f"\n▶ {name} (عامل الماء {wm:.2f}×)")
    print(f"   الإنتاج (MSF فقط): {prod_D*msf_share:,.0f} م³/يوم")
    print(f"   الحمل الحراري لـMSF: {th_D:.1f} MWth")
    print(f"   الكهرباء (منتج ثانوي من التوربين): {el_D:.1f} MWe")
    print(f"   احتياج RO الفعلي: {ro_demand_D:.1f} MWe")
    print(f"   {status} كهربائي: {abs(diff_D):,.1f} MWe")
    print(f"   الحمل الحراري المكافئ الكلي: {total_D:.1f} MWth-eq")
    peak_load_D = max(peak_load_D, total_D)

units_needed_D = math.ceil(peak_load_D / cap_per_unit)
total_capex_D = units_needed_D * capex_per_unit
annual_capex_D = total_capex_D * crf

def calculate_lcow_D(production, total_thermal_eq):
    annual_opex = (total_thermal_eq * 8760 * smr_cf) * smr_lcoe / 1_000_000
    total_annual_cost = annual_capex_D + annual_opex
    return total_annual_cost * 1_000_000 / (production * 365)

print("\n" + "-" * 60)
print(f"حمل الذروة (السيناريو الخامس): {peak_load_D:.1f} MWth-eq")
print(f"✅ عدد وحدات SMR المطلوبة (السيناريو الخامس): {units_needed_D}")
print(f"   (مقابل {units_needed} وحدة بالتصميم المتوازي الحالي)")
print("-" * 60)
for name, (wm, em) in scenarios.items():
    prod_D, th_D, el_D, total_D, ro_demand_D, diff_D = scenario_D_results[name]
    lcow_D = calculate_lcow_D(prod_D, total_D)
    print(f"▶ {name}: LCOW (السيناريو الخامس) = {lcow_D:.2f} $/م³")

# --- تحليل حساسية على طرفي نطاق نسبة الطاقة-إلى-الماء الموثق (سيناريو "عادي") ---
print("\n" + "-" * 60)
print("تحليل حساسية على نطاق نسبة الطاقة-إلى-الماء الموثق (سيناريو عادي):")
print("-" * 60)
_pw_ratio_backup = pw_ratio
for label, ratio in [("الطرف الأدنى", pw_ratio_low), ("الأساسي", pw_ratio), ("الطرف الأعلى", pw_ratio_high)]:
    pw_ratio = ratio
    _, _, el_s, total_s, ro_demand_s, diff_s = calculate_scenario_D(1.00)
    status = "فائض" if diff_s >= 0 else "عجز"
    print(f"  {label} ({ratio} MW/MIGD): كهرباء = {el_s:.1f} MWe، {status} = {abs(diff_s):,.1f} MWe مقابل احتياج RO {ro_demand_s:.1f} MWe")
pw_ratio = _pw_ratio_backup
print("=" * 60)

# ================================================
# 8) سيناريو الصيانة/تزويد الوقود — توقف وحدة واحدة (N-1)
# ================================================
# افتراض واقعي غير مؤكد رسميًا من KAERI لـSMART100 تحديدًا: مدة
# الصيانة/تزويد الوقود لكل دورة (كل 3 سنوات) تتراوح عادة 30-45 يومًا
# لمفاعلات SMR المماثلة — نطاق تقديري عام من الأدبيات الهندسية،
# وليس رقمًا رسميًا معتمدًا لهذا المفاعل تحديدًا.
maintenance_duration_low = 30    # يوم
maintenance_duration_high = 45   # يوم
maintenance_duration_typical = 37  # يوم (نقطة وسط تقريبية)

def calculate_maintenance_scenario():
    # يُطبَّق على التصميم المتوازي الأساسي (10 وحدات) فقط — وليس
    # على سيناريو التوربين التسلسلي (السيناريو الخامس أعلاه).
    units_available = units_needed - 1  # وحدة واحدة متوقفة للصيانة
    capacity_available = units_available * cap_per_unit  # MWth-eq

    print("\n" + "=" * 60)
    print(f"سيناريو الصيانة: توقف وحدة واحدة من أصل {units_needed} (N-1)")
    print("=" * 60)
    print(f"مدة الصيانة الافتراضية: {maintenance_duration_low}-{maintenance_duration_high} يومًا "
          f"(تقدير عام، غير مؤكد رسميًا لـSMART100 تحديدًا)")
    print(f"السعة الحرارية المكافئة المتاحة بـ{units_available} وحدات: {capacity_available:,.1f} MWth-eq\n")

    results = {}
    for name, (wm, em) in scenarios.items():
        prod, th, el, total = calculate_scenario(wm, em)
        margin = capacity_available - total
        safe = margin >= 0
        utilization_9 = total / capacity_available * 100
        tight = safe and (margin / capacity_available) < 0.05
        status = "✅ آمن" + (" (هامش ضيق)" if tight else "") if safe else "❌ فشل"
        results[name] = total
        print(f"▶ {name}: الحمل المطلوب {total:.1f} MWth-eq | الاستغلال بـ{units_available} وحدات: {utilization_9:.1f}% | {status}")
        if not safe:
            print(f"   عجز: {abs(margin):,.1f} MWth-eq")

    worst_name = max(results, key=results.get)
    worst_total = results[worst_name]
    units_for_n1_safety = math.ceil(worst_total / cap_per_unit) + 1
    print(f"\n▶ أسوأ سيناريو: {worst_name} ({worst_total:.1f} MWth-eq)")
    print(f"✅ عدد الوحدات المطلوب لضمان التغطية الكاملة حتى أثناء صيانة وحدة واحدة (N+1): {units_for_n1_safety}")

    return results, units_for_n1_safety, capacity_available

maintenance_results, units_n1, capacity_9units = calculate_maintenance_scenario()

# --- التأثير على LCOW عند الانتقال لتصميم N+1 ---
total_capex_n1 = units_n1 * capex_per_unit
annual_capex_n1 = total_capex_n1 * crf

def calculate_lcow_n1(production, total_thermal_eq):
    annual_opex = (total_thermal_eq * 8760 * smr_cf) * smr_lcoe / 1_000_000
    total_annual_cost = annual_capex_n1 + annual_opex
    return total_annual_cost * 1_000_000 / (production * 365)

print("\n" + "-" * 60)
print(f"تأثير الانتقال لتصميم N+1 ({units_n1} وحدة) على LCOW:")
print("-" * 60)
for name, (wm, em) in scenarios.items():
    prod, th, el, total = calculate_scenario(wm, em)
    lcow_10 = calculate_lcow(prod, total)
    lcow_11 = calculate_lcow_n1(prod, total)
    print(f"▶ {name}: LCOW بـ{units_needed} وحدة = ${lcow_10:.2f} → بـ{units_n1} وحدة = ${lcow_11:.2f} (+${lcow_11-lcow_10:.2f})")

# --- هل تكفي جدولة الصيانة بفترة انخفاض الطلب الموسمي (الشتاء) بدل وحدة احتياطية؟ ---
# نفس صيغة الموجة الموسمية المستخدمة بـsimulation.py: تتراوح بين 0.9
# (أدنى طلب شتوي) و1.3 (أعلى طلب صيفي)
print("\n" + "-" * 60)
print("هل تكفي جدولة الصيانة في فترة انخفاض الطلب الموسمي (الشتاء) بدل وحدة احتياطية؟")
print("-" * 60)
seasonal_min_water_mult = 0.9   # أدنى نقطة بالموجة الموسمية (راجع simulation.py)
seasonal_min_elec_mult = round(seasonal_min_water_mult * 0.98, 3)
prod_w, th_w, el_w, total_w = calculate_scenario(seasonal_min_water_mult, seasonal_min_elec_mult)
margin_w = capacity_9units - total_w
safe_w = margin_w >= 0
util_w = total_w / capacity_9units * 100
print(f"الحمل المتوقع بأدنى نقطة طلب شتوية (عامل ماء {seasonal_min_water_mult}×): {total_w:.1f} MWth-eq")
print(f"السعة المتاحة بـ{units_needed-1} وحدات: {capacity_9units:,.1f} MWth-eq")
print(f"نسبة الاستغلال: {util_w:.1f}%")
if safe_w:
    print(f"✅ هامش أمان {margin_w:,.1f} MWth-eq — تكفي جدولة الصيانة شتاءً بدون الحاجة لوحدة احتياطية دائمة")
else:
    print(f"❌ عجز {abs(margin_w):,.1f} MWth-eq — لا تكفي حتى الجدولة الشتوية")
print("=" * 60)

# ================================================
# 9) تحليل التحسين: النسبة المثلى بين MSF وRO
# ================================================
# ملاحظة مهمة: هذا افتراض تصميمي نظري لفهم الحساسية — "ماذا لو
# صمّمنا محطة تحلية جديدة من الصفر لمنظومة SMART100 بالذات" — وليس
# توصية بتعديل محطة رأس الخير القائمة فعليًا، التي لها بنية تحتية
# ثابتة (8 وحدات MSF + 17 وحدة RO) صُمِّمت أصلًا حول توفر حرارة
# "شبه مجانية" من توربينات غازية تقليدية، لا حول تكلفة كل وحدة
# طاقة حرارية كما في سياق مفاعل SMR مخصَّص. يُطبَّق هذا التحليل على
# السيناريوهات الأربعة الأصلية فقط (وليس السيناريو الخامس أو سيناريو الصيانة).
#
# ⚠️ نطاق محدود — مهم جدًا: هذا التحليل يقيس فقط تكلفة الطاقة
# النووية المطلوبة من SMART100 (LCOW مشتقة حصريًا من annual_capex
# وannual_opex الخاصين بوحدات المفاعل). لا يشمل: تكلفة معدات MSF/RO
# الرأسمالية (بناء الوحدات نفسها)، استبدال أغشية RO الدورية،
# الكيماويات ومضادات الترسّب لأي من التقنيتين، ولا فروق جودة المياه.
# لذلك النتيجة تعني تحديدًا "RO أرخص من منظور تكلفة الطاقة النووية
# فقط" — وليست توصية هندسية شاملة بأن الحل الأمثل عمليًا هو 100% RO.
def calculate_optimal_ratio():
    msf_ratios = [round(i * 0.05, 2) for i in range(21)]  # 0.00 .. 1.00 بخطوات 5%
    steam_per_m3 = 1000 / gor
    results = {}

    for name, (wm, em) in scenarios.items():
        production = production_total * wm
        rows = []
        for f in msf_ratios:
            msf_prod = production * f
            ro_prod = production * (1 - f)
            thermal_mw = (msf_prod * steam_per_m3 * steam_enthalpy) / 24 / 1000
            electric_mw = (ro_prod * ro_kwh + msf_prod * msf_aux_kwh) * em / 24 / 1000
            total_eq = thermal_mw + electric_mw / smr_eff
            units_f = math.ceil(total_eq / cap_per_unit)
            annual_capex_f = units_f * capex_per_unit * crf
            annual_opex_f = (total_eq * 8760 * smr_cf) * smr_lcoe / 1_000_000
            lcow_f = (annual_capex_f + annual_opex_f) * 1_000_000 / (production * 365)
            rows.append({
                "scenario": name, "msf_ratio": f, "ro_ratio": round(1 - f, 2),
                "thermal_MWth": round(thermal_mw, 1), "electric_MWe": round(electric_mw, 1),
                "total_thermal_eq_MWth": round(total_eq, 1), "units": units_f,
                "LCOW_usd_m3": round(lcow_f, 3),
            })
        results[name] = rows
    return results, msf_ratios

optimal_ratio_results, msf_ratio_sweep = calculate_optimal_ratio()

print("\n" + "=" * 60)
print("تحليل التحسين: النسبة المثلى بين MSF وRO (افتراض تصميمي نظري)")
print("=" * 60)
print("⚠️  هذا تحليل 'ماذا لو صمّمنا من الصفر' لفهم الحساسية فقط —")
print("    ليس توصية بتعديل محطة رأس الخير القائمة فعليًا.")
print("⚠️  نطاق محدود: يقيس فقط تكلفة الطاقة النووية من SMART100 —")
print("    لا يشمل تكلفة معدات MSF/RO الرأسمالية، استبدال الأغشية،")
print("    الكيماويات، أو جودة المياه. النتيجة = 'RO أرخص من منظور")
print("    الطاقة النووية فقط'، وليست توصية هندسية شاملة بـ100% RO.\n")

REAL_RATIO = 0.702  # النسبة الفعلية الحالية لرأس الخير (70.2% MSF)
optimization_csv_rows = []
for name, rows in optimal_ratio_results.items():
    optimization_csv_rows.extend(rows)
    best = min(rows, key=lambda r: r["LCOW_usd_m3"])
    nearest_real = min(rows, key=lambda r: abs(r["msf_ratio"] - REAL_RATIO))
    gap_pct = (nearest_real["LCOW_usd_m3"] - best["LCOW_usd_m3"]) / best["LCOW_usd_m3"] * 100
    print(f"▶ {name}")
    print(f"   النسبة المثلى (أقل LCOW): {best['msf_ratio']*100:.0f}% MSF / {best['ro_ratio']*100:.0f}% RO → LCOW = ${best['LCOW_usd_m3']:.3f}/م³")
    print(f"   عند نسبة رأس الخير الفعلية (70.2% MSF): LCOW = ${nearest_real['LCOW_usd_m3']:.3f}/م³ "
          f"(أعلى بـ{gap_pct:.1f}% من المثالي)")

print("\n" + "-" * 60)
print("شكل العلاقة: خطية تمامًا (وليست U-shaped) عبر كل السيناريوهات الأربعة.")
print("السبب: MSF يستهلك 62.7 kWh_th مباشرة لكل م³ (GOR=10)، بينما")
print("كهرباء RO (4.0 kWh_e/م³) تعادل حراريًا 4.0/0.303≈13.2 kWh_th-eq")
print("لكل م³ فقط — أقل بكثير حتى بعد احتساب خسارة كفاءة التحويل.")
print("النسبة المثلى نظريًا تقع عند الطرف الأقصى (0% MSF / 100% RO)،")
print("لا عند نقطة داخلية وسطى.")
print("\nلماذا نسبة رأس الخير الفعلية (70.2% MSF) بعيدة عن هذا المثالي؟")
print("رأس الخير صُمِّمت أصلًا حول توربينات غازية تقليدية توفر حرارة")
print("نفايات (Waste Heat) شبه مجانية لـMSF — لا حول تكلفة كل وحدة")
print("طاقة حرارية كما بسياق مفاعل SMR مخصَّص. النسبة الفعلية عكست")
print("اقتصاديات التوربينات الغازية القائمة وقتها، لا اقتصاديات SMR.")
print("=" * 60)

# --- حفظ بيانات المنحنى الكامل لعرضها بالموقع ---
with open("optimal_ratio.csv", "w", newline="", encoding="utf-8-sig") as f:
    writer = csv.DictWriter(f, fieldnames=optimization_csv_rows[0].keys())
    writer.writeheader()
    writer.writerows(optimization_csv_rows)
print(f"\n✅ تم حفظ {len(optimization_csv_rows)} صف (بيانات منحنى LCOW مقابل نسبة MSF) في optimal_ratio.csv")