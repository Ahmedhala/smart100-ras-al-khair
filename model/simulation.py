# ================================================
# محاكاة سنة تشغيل كاملة (365 يوم) - طلب موسمي واقعي
# ================================================
import math
import csv

# --- معادلات النموذج (نفس model.py) ---
production_total = 1_036_000
msf_share, ro_share = 0.702, 0.298
ro_kwh, msf_aux_kwh, gor, steam_enthalpy = 4.0, 3.0, 10.0, 0.627
smr_elec, smr_eff, smr_cf, smr_lcoe = 100.0, 0.303, 0.92, 75
capex_per_unit = 1000   # متحفظ
discount_rate, project_life = 0.07, 60

crf = (discount_rate*(1+discount_rate)**project_life)/((1+discount_rate)**project_life-1)

# --- تخصيص التكلفة بين الماء والكهرباء (Exergy-based) — نفس منهجية
# model.py بالضبط، مطبَّقة هنا كمان لأن "LCOW المتوسط السنوي" مطلوب من
# نفس المحاكاة اليومية بهذا الملف، ولازم يبقى متسقًا مع أرقام model.py
# المخصَّصة الجديدة بدل ما يبقى بالمنهجية القديمة غير المخصَّصة وحده.
CARNOT_PHI = 1 - (308.15 / 393.15)

def cost_share_water(thermal_mw, electric_mw, p_total_mwe):
    # P_total = القدرة الكهربائية المُنتَجة فعلياً من الأسطول (units×
    # smr_elec)، ثابت لكل استدعاء — لا P_el_desal+Q_th×η (كانت تجعل
    # الحصة =1.000 حتماً عند Q_th=0، متجاهلة الفائض الكهربائي الحقيقي).
    # راجع التعليق المطابق بـmodel.py للتفاصيل الكاملة والمحاولات السابقة.
    return (thermal_mw * CARNOT_PHI + electric_mw) / (thermal_mw * CARNOT_PHI + p_total_mwe)

def calc(water_mult, elec_mult):
    prod = production_total * water_mult
    msf_prod = prod * msf_share
    thermal = (msf_prod*(1000/gor)*steam_enthalpy)/24/1000
    ro_prod = prod * ro_share
    electric_mw = (ro_prod*ro_kwh + msf_prod*msf_aux_kwh)*elec_mult/24/1000
    total_eq = thermal + electric_mw/smr_eff
    return prod, thermal, electric_mw, total_eq

# --- السيناريو الخامس (مقترح المشرف): توربين الضغط الخلفي التسلسلي ---
# نفس منهجية model.py — راجع التوثيق هناك لتفاصيل المصدر والافتراضات
pw_ratio = 12          # MW/MIGD — تقدير هندسي أساسي (نطاق موثق: 10.2-17.5)
migd_to_m3 = 4_546

def calc_D(water_mult):
    prod = production_total * water_mult
    msf_prod = prod * msf_share
    msf_prod_migd = msf_prod / migd_to_m3
    electric_mw = msf_prod_migd * pw_ratio
    thermal = (msf_prod*(1000/gor)*steam_enthalpy)/24/1000
    total_eq = thermal + electric_mw/smr_eff
    ro_prod = prod * ro_share
    ro_demand_mw = (ro_prod*ro_kwh + msf_prod*msf_aux_kwh)/24/1000
    surplus_deficit_mw = electric_mw - ro_demand_mw
    return prod, thermal, electric_mw, total_eq, ro_demand_mw, surplus_deficit_mw

# --- التحجيم (10 وحدات) ---
peak = calc(1.30, 1.30)[3]
cap_per_unit = smr_elec/smr_eff
units = math.ceil(peak/cap_per_unit)
annual_capex = units*capex_per_unit*crf

# --- تحجيم السيناريو الخامس (33 وحدة تقريبًا — محكوم بالفائض الكهربائي) ---
peak_D = calc_D(1.30)[3]
units_D = math.ceil(peak_D/cap_per_unit)
annual_capex_D = units_D*capex_per_unit*crf

# ================================================
# توليد طلب يومي لسنة كاملة (365 يوم)
# ================================================
print("=" * 60)
print("محاكاة سنة تشغيل كاملة (365 يوم)")
print("=" * 60)

daily_rows = []
daily_rows_D = []
for day in range(1, 366):
    # نمط موسمي: ذروة بالصيف (يوليو ≈ يوم 200)، أقل بالشتاء
    # جيب موجة موسمية بين 0.9 و 1.3
    seasonal = 1.1 + 0.2 * math.sin((day - 100) / 365 * 2 * math.pi)
    water_mult = round(seasonal, 3)
    elec_mult = round(seasonal * 0.98, 3)   # الكهرباء تتبع الماء تقريبًا
    prod, th, el, total = calc(water_mult, elec_mult)
    utilization = total / (units * cap_per_unit)

    # LCOW اليومي — مخصَّص بين الماء والكهرباء (نفس منهجية model.py)
    annual_opex = (total*8760*smr_cf)*smr_lcoe/1_000_000
    total_annual_cost = annual_capex + annual_opex
    lcow_unalloc = total_annual_cost*1_000_000/(prod*365)
    share_w = cost_share_water(th, el, units * smr_elec)
    lcow = lcow_unalloc * share_w

    daily_rows.append({
        "day": day,
        "water_mult": water_mult,
        "production_m3": round(prod, 0),
        "utilization": round(utilization, 4),
        "LCOW": round(lcow, 3),
        "LCOW_unallocated": round(lcow_unalloc, 3),
        "cost_share_water": round(share_w, 4),
        "suitable": "نعم" if utilization <= 1.0 else "لا",
    })

    # --- السيناريو الخامس (نفس اليوم، نفس عامل الماء) ---
    # P_el_desal هنا = ro_demand_D (احتياج RO الفعلي)، وليس el_D (الكهرباء
    # "المنتج الثانوي" المولَّدة) — نفس تصحيح model.py's calculate_lcow_D
    prod_D, th_D, el_D, total_D, ro_demand_D, diff_D = calc_D(water_mult)
    utilization_D = total_D / (units_D * cap_per_unit)
    annual_opex_D = (total_D*8760*smr_cf)*smr_lcoe/1_000_000
    total_annual_cost_D = annual_capex_D + annual_opex_D
    lcow_D_unalloc = total_annual_cost_D*1_000_000/(prod_D*365)
    share_w_D = cost_share_water(th_D, ro_demand_D, units_D * smr_elec)
    lcow_D = lcow_D_unalloc * share_w_D

    daily_rows_D.append({
        "day": day,
        "water_mult": water_mult,
        "production_m3": round(prod_D, 0),
        "electric_MWe": round(el_D, 1),
        "ro_demand_MWe": round(ro_demand_D, 1),
        "surplus_deficit_MWe": round(diff_D, 1),
        "utilization": round(utilization_D, 4),
        "LCOW": round(lcow_D, 3),
        "LCOW_unallocated": round(lcow_D_unalloc, 3),
        "cost_share_water": round(share_w_D, 4),
        "suitable": "نعم" if utilization_D <= 1.0 else "لا",
    })

# حفظ
with open("year_simulation.csv", "w", newline="", encoding="utf-8-sig") as f:
    writer = csv.DictWriter(f, fieldnames=daily_rows[0].keys())
    writer.writeheader()
    writer.writerows(daily_rows)

# ملخص إحصائي
utils = [r["utilization"] for r in daily_rows]
lcows = [r["LCOW"] for r in daily_rows]
days_over = sum(1 for r in daily_rows if r["utilization"] > 1.0)

print(f"✅ تم محاكاة 365 يوم وحفظها في year_simulation.csv\n")
print(f"أعلى استغلال بالسنة: {max(utils)*100:.1f}%")
print(f"أقل استغلال بالسنة: {min(utils)*100:.1f}%")
print(f"متوسط الاستغلال: {sum(utils)/len(utils)*100:.1f}%")
print(f"عدد أيام تجاوز السعة (غير مناسب): {days_over} يوم من 365")
print(f"\nمتوسط LCOW السنوي: {sum(lcows)/len(lcows):.3f} $/م³")
print(f"أعلى LCOW: {max(lcows):.3f} | أقل LCOW: {min(lcows):.3f} $/م³")

# ================================================
# السيناريو الخامس (مقترح المشرف): محاكاة سنوية للتوربين التسلسلي
# ================================================
with open("year_simulation_scenario_D.csv", "w", newline="", encoding="utf-8-sig") as f:
    writer = csv.DictWriter(f, fieldnames=daily_rows_D[0].keys())
    writer.writeheader()
    writer.writerows(daily_rows_D)

utils_D = [r["utilization"] for r in daily_rows_D]
lcows_D = [r["LCOW"] for r in daily_rows_D]
diffs_D = [r["surplus_deficit_MWe"] for r in daily_rows_D]
days_over_D = sum(1 for r in daily_rows_D if r["utilization"] > 1.0)
days_deficit_D = sum(1 for r in daily_rows_D if r["surplus_deficit_MWe"] < 0)

print("\n" + "=" * 60)
print("السيناريو الخامس: محاكاة سنوية — توربين الضغط الخلفي التسلسلي")
print("=" * 60)
print(f"✅ تم محاكاة 365 يوم وحفظها في year_simulation_scenario_D.csv\n")
print(f"عدد الوحدات المطلوبة: {units_D} (مقابل {units} بالتصميم المتوازي)")
print(f"متوسط الاستغلال: {sum(utils_D)/len(utils_D)*100:.1f}%")
print(f"عدد أيام تجاوز السعة: {days_over_D} يوم من 365")
print(f"متوسط LCOW السنوي: {sum(lcows_D)/len(lcows_D):.3f} $/م³")
print(f"أعلى LCOW: {max(lcows_D):.3f} | أقل LCOW: {min(lcows_D):.3f} $/م³")
print(f"\nمتوسط الفائض/العجز الكهربائي اليومي: {sum(diffs_D)/len(diffs_D):,.1f} MWe")
print(f"أدنى فائض يومي: {min(diffs_D):,.1f} MWe | أعلى فائض يومي: {max(diffs_D):,.1f} MWe")
print(f"عدد أيام العجز الكهربائي (فائض سالب): {days_deficit_D} يوم من 365")
print("=" * 60)

# ================================================
# سيناريو الصيانة/تزويد الوقود: جدولة توقف وحدة واحدة شتاءً
# ================================================
# نفس افتراض model.py: مدة صيانة 30-45 يومًا (تقدير عام غير مؤكد
# رسميًا لـSMART100)؛ نجدولها حول أدنى نقطة بالموجة الموسمية (يوم
# ~9، منتصف الشتاء تقريبًا) بدل توقف عشوائي بأي وقت من السنة.
# يستخدم نفس أسطول الـ10 وحدات الأساسي (annual_capex بلا تغيير) —
# الهدف اختبار هل الجدولة الذكية تُغني عن شراء وحدة N+1 إضافية.
maintenance_duration = 37   # يوم (نقطة وسط تقريبية من نطاق 30-45)
maintenance_center_day = 9  # أدنى نقطة بالموجة الموسمية
_half = maintenance_duration // 2
maintenance_days = set(((maintenance_center_day - _half + i - 1) % 365) + 1 for i in range(maintenance_duration))

daily_rows_M = []
for day in range(1, 366):
    seasonal = 1.1 + 0.2 * math.sin((day - 100) / 365 * 2 * math.pi)
    water_mult = round(seasonal, 3)
    elec_mult = round(seasonal * 0.98, 3)
    prod, th, el, total = calc(water_mult, elec_mult)

    on_maintenance = day in maintenance_days
    units_available_M = (units - 1) if on_maintenance else units
    utilization_M = total / (units_available_M * cap_per_unit)

    # annual_capex الأصلي (10 وحدات) بلا تغيير — نختبر جدولة الصيانة
    # الذكية كبديل لشراء وحدة إضافية، لا كإضافة لها. P_total يبقى مبنيًا
    # على الـ10 وحدات المدفوعة فعليًا (units)، وليس units_available_M
    # المؤقتة، لأن التخصيص يعكس رأس المال المملوك لا التوافر اليومي.
    annual_opex_M = (total*8760*smr_cf)*smr_lcoe/1_000_000
    total_annual_cost_M = annual_capex + annual_opex_M
    lcow_M_unalloc = total_annual_cost_M*1_000_000/(prod*365)
    share_w_M = cost_share_water(th, el, units * smr_elec)
    lcow_M = lcow_M_unalloc * share_w_M

    daily_rows_M.append({
        "day": day,
        "water_mult": water_mult,
        "production_m3": round(prod, 0),
        "on_maintenance": "نعم" if on_maintenance else "لا",
        "units_available": units_available_M,
        "utilization": round(utilization_M, 4),
        "LCOW": round(lcow_M, 3),
        "LCOW_unallocated": round(lcow_M_unalloc, 3),
        "cost_share_water": round(share_w_M, 4),
        "suitable": "نعم" if utilization_M <= 1.0 else "لا",
    })

with open("year_simulation_maintenance.csv", "w", newline="", encoding="utf-8-sig") as f:
    writer = csv.DictWriter(f, fieldnames=daily_rows_M[0].keys())
    writer.writeheader()
    writer.writerows(daily_rows_M)

utils_M = [r["utilization"] for r in daily_rows_M]
lcows_M = [r["LCOW"] for r in daily_rows_M]
maint_rows = [r for r in daily_rows_M if r["on_maintenance"] == "نعم"]
maint_utils = [r["utilization"] for r in maint_rows]
days_over_M = sum(1 for r in daily_rows_M if r["utilization"] > 1.0)
days_over_during_maint = sum(1 for r in maint_rows if r["utilization"] > 1.0)

print("\n" + "=" * 60)
print("سيناريو الصيانة: محاكاة سنوية — جدولة توقف وحدة واحدة شتاءً")
print("=" * 60)
print(f"✅ تم محاكاة 365 يوم وحفظها في year_simulation_maintenance.csv\n")
print(f"نافذة الصيانة المجدولة: {maintenance_duration} يومًا حول اليوم {maintenance_center_day} (منتصف الشتاء)")
print(f"متوسط الاستغلال طوال السنة: {sum(utils_M)/len(utils_M)*100:.1f}%")
print(f"متوسط الاستغلال أثناء نافذة الصيانة تحديدًا: {sum(maint_utils)/len(maint_utils)*100:.1f}%")
print(f"أعلى استغلال أثناء نافذة الصيانة: {max(maint_utils)*100:.1f}%")
print(f"عدد أيام تجاوز السعة طوال السنة: {days_over_M} يوم من 365")
print(f"عدد أيام تجاوز السعة أثناء نافذة الصيانة تحديدًا: {days_over_during_maint} يوم من {maintenance_duration}")
print(f"متوسط LCOW السنوي: {sum(lcows_M)/len(lcows_M):.3f} $/م³ (بنفس تكلفة الـ10 وحدات — بلا وحدة إضافية)")
if days_over_during_maint == 0:
    print("✅ الجدولة الشتوية الذكية تُغني عن شراء وحدة N+1 إضافية طوال السنة المحاكاة")
else:
    print(f"❌ حتى الجدولة الشتوية غير كافية في {days_over_during_maint} يومًا — يلزم N+1")

# ================================================
# ملاحظة: تحليل التحسين (النسبة المثلى MSF:RO) غير مكرَّر هنا
# ================================================
# راجع model.py (القسم 9) لتحليل النسبة المثلى الكامل. لم يُكرَّر
# كمحاكاة يومية لـ365 يوم لأن النتيجة لا تتغير عبر أيام السنة:
# النسبة المثلى محكومة فقط بالثوابت الفيزيائية الثابتة (GOR،
# ro_kwh، msf_aux_kwh، smr_eff) وليس بمستوى الطلب اليومي — تكبير أو
# تصغير الإنتاج يوميًا (water_mult) يُحجِّم كل المنحنى تناسبيًا دون
# تغيير شكله أو موقع نقطته المثلى. محاكاة يومية كاملة هنا كانت
# ستُعيد نفس الاستنتاج 365 مرة بأرقام مصغَّرة/مكبَّرة فقط.
print("\n(ملاحظة: تحليل النسبة المثلى بين MSF وRO غير مكرَّر هنا — راجع model.py، القسم 9. "
      "النسبة المثلى ثابتة عبر أيام السنة، لا تتغير بتغيّر الطلب اليومي.)")
print("=" * 60)

# ================================================
# سيناريو الخزان المائي (Storage Buffer): تصميم بمعدل ثابت
# ================================================
# بدل تحجيم المنظومة على أعلى يوم طلب بالسنة (Peak-following، كما
# بالتصميم الحالي)، هذا السيناريو يختبر تصميم Load-following: إنتاج
# بمعدل ثابت يوميًا + خزان مائي يمتص فروقات الطلب الموسمية. يعيد
# استخدام سلسلة الطلب اليومي (production_m3) من daily_rows أعلاه
# مباشرة — بلا حاجة لإعادة قراءة year_simulation.csv من القرص.
daily_demand = [r["production_m3"] for r in daily_rows]
avg_demand = sum(daily_demand) / len(daily_demand)
max_demand = max(daily_demand)

def simulate_tank(p_const, storage_capacity):
    """يحاكي توازن الخزان اليومي على مدار السنة؛ يبدأ نصف ممتلئ.
    يُعيد True لو لم ينفد الخزان بأي يوم (يعني هذا المعدل الثابت كافٍ)."""
    tank = storage_capacity / 2
    for demand in daily_demand:
        tank += p_const - demand
        if tank < 0:
            return False
        if tank > storage_capacity:
            tank = storage_capacity  # فائض يُهدَر (Overflow) — ليس فشلًا
    return True

def calculate_storage_scenario(storage_days_list):
    results = {}
    for storage_days in storage_days_list:
        storage_capacity = storage_days * avg_demand

        # بحث خطي عن أقل معدل إنتاج ثابت يمنع نفاد الخزان طوال السنة،
        # بدءًا من متوسط الطلب السنوي (80.5% استغلال) وصعودًا نحو
        # أعلى طلب يومي مسجَّل (المعادل لتصميم الذروة الحالي بلا خزان)
        step = (max_demand - avg_demand) / 500
        p_const = avg_demand
        found = False
        while p_const <= max_demand + step:
            if simulate_tank(p_const, storage_capacity):
                found = True
                break
            p_const += step

        water_mult_const = p_const / production_total if found else None
        results[storage_days] = {
            "storage_capacity_m3": storage_capacity,
            "min_constant_production_m3": p_const if found else None,
            "margin_above_average_pct": (p_const / avg_demand - 1) * 100 if found else None,
            "water_mult_const": water_mult_const,
            "found": found,
        }
    return results

storage_results = calculate_storage_scenario([3, 7, 14, 30])

print("\n" + "=" * 60)
print("سيناريو الخزان المائي: تصميم بمعدل ثابت (Load-following) بدل الذروة")
print("=" * 60)
print(f"متوسط الطلب السنوي: {avg_demand:,.0f} م³/يوم | أعلى طلب يومي: {max_demand:,.0f} م³/يوم")
print(f"(التصميم الحالي بلا خزان: {units} وحدة، مبني على أعلى طلب يومي)\n")

storage_summary = []
for storage_days, r in storage_results.items():
    if not r["found"]:
        print(f"▶ خزان {storage_days} يوم: ❌ لا يوجد معدل ثابت (حتى عند أعلى طلب) يمنع نفاد الخزان")
        continue

    prod_c, th_c, el_c, total_c = calc(r["water_mult_const"], 1.0)
    units_c = math.ceil(total_c / cap_per_unit)
    annual_capex_c = units_c * capex_per_unit * crf
    annual_opex_c = (total_c * 8760 * smr_cf) * smr_lcoe / 1_000_000
    lcow_c_unalloc = (annual_capex_c + annual_opex_c) * 1_000_000 / (avg_demand * 365)
    share_w_c = cost_share_water(th_c, el_c, units_c * smr_elec)
    lcow_c = lcow_c_unalloc * share_w_c
    units_saved = units - units_c

    print(f"▶ خزان {storage_days} يوم (سعة {r['storage_capacity_m3']:,.0f} م³):")
    print(f"   أقل معدل إنتاج ثابت آمن: {r['min_constant_production_m3']:,.0f} م³/يوم "
          f"(+{r['margin_above_average_pct']:.1f}% فوق المتوسط)")
    print(f"   عدد الوحدات المطلوب: {units_c} (مقابل {units} بالتصميم الحالي بلا خزان) "
          f"→ توفير {units_saved} وحدة" if units_saved > 0 else
          f"   عدد الوحدات المطلوب: {units_c} (لا توفير مقارنة بـ{units} وحدة الحالية)")
    print(f"   LCOW الناتج: ${lcow_c:.3f}/م³")
    storage_summary.append((storage_days, units_c, units_saved, lcow_c, r["storage_capacity_m3"]))

print("\n" + "-" * 60)
print("⚠️  تنويه صريح مهم: هذا التحليل يحسب فقط تكلفة الطاقة النووية")
print("    (تغيّر annual_capex وannual_opex لمنظومة SMART100). لا يشمل")
print("    إطلاقًا تكلفة إنشاء الخزان المائي نفسه — وهو عادة إنشاءات")
print("    مدنية ضخمة (خزان 30 يومًا هنا يعني سعة ~31 مليون م³، بحجم")
print("    بحيرة اصطناعية كبيرة). أي توفير محسوب أدناه بجانب المفاعل")
print("    يجب مقارنته صراحة بتكلفة الخزان غير المحسوبة هنا قبل أي")
print("    استنتاج نهائي عن الجدوى الاقتصادية الكلية.")
print("-" * 60)

if storage_summary:
    best = min(storage_summary, key=lambda x: x[1])
    if best[2] > 0:
        print(f"✅ أفضل نتيجة: خزان {best[0]} يوم يوفّر {best[2]} وحدة "
              f"({units} → {best[1]}) بـLCOW ${best[3]:.3f}/م³ — لكن راجع التنويه أعلاه.")
    else:
        print("❌ لا يوجد حجم خزان مجرَّب (حتى 30 يومًا) يوفّر عددًا حقيقيًا من الوحدات.")
print("=" * 60)

# --- حفظ محاكاة الخزان اليومية لأفضل سيناريو (لعرضها بالموقع) ---
if storage_summary:
    best_days = best[0]
    best_capacity = storage_results[best_days]["storage_capacity_m3"]
    best_p_const = storage_results[best_days]["min_constant_production_m3"]
    tank_level = best_capacity / 2
    tank_rows = []
    for day, demand in enumerate(daily_demand, start=1):
        tank_level += best_p_const - demand
        tank_level = max(0, min(tank_level, best_capacity))
        tank_rows.append({
            "day": day,
            "demand_m3": round(demand, 0),
            "constant_production_m3": round(best_p_const, 0),
            "tank_level_m3": round(tank_level, 0),
            "tank_level_pct": round(tank_level / best_capacity * 100, 2),
        })
    with open("storage_scenario.csv", "w", newline="", encoding="utf-8-sig") as f:
        writer = csv.DictWriter(f, fieldnames=tank_rows[0].keys())
        writer.writeheader()
        writer.writerows(tank_rows)
    print(f"\n✅ تم حفظ محاكاة مستوى الخزان اليومية (أفضل سيناريو: {best_days} يوم) في storage_scenario.csv")