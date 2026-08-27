// ==========================================================================
// Whole-plant 3D model component data — shared by the Three.js viewer, the
// side panel, the component-select list, and the reference grid on plant.html.
// ==========================================================================
const PLANT_3D_COMPONENTS = [
  {
    id: 'energy-input',
    nameAr: 'الطاقة الواردة من SMART100',
    nameEn: 'Energy Input from SMART100',
    color: '#ffdd6b',
    desc: 'نقطة دخول الطاقة إلى حدود المحطة من وحدات SMART100 العشر — تتفرّع إلى مسارين: بخار حراري نحو وحدات MSF، وكهرباء نحو وحدات RO ومضخات المحطة العامة.'
  },
  {
    id: 'seawater-intake',
    nameAr: 'مأخذ مياه البحر العام',
    nameEn: 'Common Seawater Intake',
    color: '#3fb8e0',
    desc: 'نقطة سحب مياه البحر الخام المشتركة للمحطة بأكملها، قبل أن تتفرّع مياه التغذية بين خطي MSF وRO كل بحسب متطلبات معالجته الأولية الخاصة.'
  },
  {
    id: 'msf-block',
    nameAr: 'مجمّع وحدات MSF',
    nameEn: 'MSF Unit Block (×8)',
    color: '#ff7a45',
    desc: 'ثماني وحدات تقطير ومضي متعدد المراحل تعمل بالحرارة بالكامل، وتنتج 70.2% من إجمالي مياه المحطة. راجع النموذج التفصيلي ثلاثي الأبعاد في صفحة MSF لرؤية داخل كل وحدة.'
  },
  {
    id: 'ro-block',
    nameAr: 'مجمّع وحدات RO',
    nameEn: 'RO Unit Block (×17)',
    color: '#ffc23c',
    desc: 'سبع عشرة وحدة تناضح عكسي تعمل بالكهرباء بالكامل، وتنتج 29.8% من إجمالي مياه المحطة. راجع النموذج التفصيلي ثلاثي الأبعاد في صفحة RO لرؤية داخل كل وحدة.'
  },
  {
    id: 'product-water',
    nameAr: 'خزان الماء المنتَج',
    nameEn: 'Product Water Header',
    color: '#33c46a',
    desc: 'خط التجميع المشترك الذي يستقبل الماء المقطَّر من MSF والماء العذب (Permeate) من RO معًا، بإجمالي 1,036,000 م³/يوم، تمهيدًا لمرحلة المعالجة اللاحقة وإعادة إضافة المعادن.'
  },
  {
    id: 'brine-discharge',
    nameAr: 'تصريف المحلول الملحي المشترك',
    nameEn: 'Combined Brine Discharge',
    color: '#ef5757',
    desc: 'خط التصريف المشترك الذي يستقبل المياه المالحة المركّزة المتبقية من كلا الخطين — MSF وRO — قبل إدارتها بيئيًا وفق ضوابط تصريف المحلول الملحي إلى البحر.'
  },
];
