// ==========================================================================
// Digital Twin-Inspired Simulation 3D model component data — the full SMART100 → Ras Al-Khair
// journey, shared by the Three.js viewer, the side panel, the
// component-select list, and the reference grid on integration.html.
// ==========================================================================
const TWIN_3D_COMPONENTS = [
  {
    id: 'smart100',
    nameAr: 'محطة مفاعلات SMART100 (×10)',
    nameEn: 'SMART100 Reactor Station (×10)',
    color: '#6fb6ff',
    desc: 'عشر وحدات مفاعل SMART100، كل واحدة 100 MWe / 330 MWth — المصدر الوحيد للطاقة في هذه المنظومة، ينتج بخارًا حراريًا وكهرباء في آن واحد. راجع النموذج التفصيلي ثلاثي الأبعاد في صفحة المفاعل لرؤية داخل الوحدة الواحدة.'
  },
  {
    id: 'thermal-path',
    nameAr: 'المسار الحراري (بخار)',
    nameEn: 'Thermal Path (Steam)',
    color: '#ff7a45',
    desc: 'بخار حراري يُنقَل مباشرة من مولدات البخار داخل مفاعلات SMART100 إلى المسخّنات (Brine Heaters) في وحدات MSF — دون أي تحويل وسيط، وهذا ما يمنح MSF كفاءته العالية كتقنية توليد مشترك.'
  },
  {
    id: 'electric-path',
    nameAr: 'المسار الكهربائي',
    nameEn: 'Electrical Path',
    color: '#ffc23c',
    desc: 'كهرباء تُنتَج عبر توربينات ومولّدات SMART100 وتُنقَل إلى مضخات الضغط العالي في وحدات RO — إضافة لتغطية أحمال المحطة الكهربائية العامة الأخرى.'
  },
  {
    id: 'plant-block',
    nameAr: 'محطة رأس الخير (MSF + RO)',
    nameEn: 'Ras Al-Khair Plant (MSF + RO)',
    color: '#a78bfa',
    desc: 'المحطة الهجينة التي تستقبل الطاقتين الحرارية والكهربائية معًا وتحوّلهما إلى مياه عذبة عبر ثماني وحدات MSF وسبع عشرة وحدة RO تعمل بالتوازي. راجع النموذج ثلاثي الأبعاد الشامل للمحطة لمزيد من التفصيل.'
  },
  {
    id: 'seawater-path',
    nameAr: 'مسار مياه البحر',
    nameEn: 'Seawater Path',
    color: '#3fb8e0',
    desc: 'مياه البحر الخام تدخل المحطة من مأخذ مشترك وتتوزع بين خطي MSF وRO كمياه تغذية أولية — نقطة البداية الفعلية لدورة إنتاج الماء العذب.'
  },
  {
    id: 'fresh-water',
    nameAr: 'الماء العذب المنتَج',
    nameEn: 'Fresh Water Output',
    color: '#33c46a',
    desc: 'الناتج النهائي للمنظومة بأكملها — 1,036,000 م³/يوم من الماء العذب، مجمّعة من الماء المقطَّر (MSF) والماء العذب (Permeate من RO) معًا، جاهزة لتغذية الرياض ومناطق أخرى.'
  },
  {
    id: 'brine-path',
    nameAr: 'مسار المحلول الملحي المرفوض',
    nameEn: 'Reject Brine Path',
    color: '#ef5757',
    desc: 'الناتج الثانوي الحتمي لعملية التحلية — مياه مالحة مركّزة من كلا الخطين، تُصرَّف بيئيًا إلى البحر وفق ضوابط تصريف المحلول الملحي بعد مغادرتها حدود المحطة.'
  },
];
