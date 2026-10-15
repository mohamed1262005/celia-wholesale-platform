import React from 'react';

export function PrivacyPolicyPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12" dir="rtl">
      <div className="bg-white rounded-2xl shadow-sm p-8 space-y-6 text-right">
        <h1 className="text-3xl font-bold text-gray-900 border-b pb-4">
          سياسة الخصوصية - Privacy Policy
        </h1>
        
        <p className="text-gray-600 leading-relaxed">
          مرحباً بك في تطبيق وموقع "سليا بريميوم سويتس" (Celia Premium Sweets). نحن نلتزم بحماية خصوصيتك وبياناتك الشخصية.
        </p>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-gray-800">
            1. البيانات التي نجمعها (Information We Collect)
          </h2>
          <p className="text-gray-600 leading-relaxed">
            عند تسجيلك أو استخدامك لتطبيقنا لطلب الحلويات بالجملة، قد نقوم بجمع معلومات مثل: الاسم، رقم الهاتف، عنوان الشحن، والبريد الإلكتروني لتسهيل عمليات الطلب والتوصيل.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-gray-800">
            2. استخدام البيانات (Use of Information)
          </h2>
          <p className="text-gray-600 leading-relaxed">
            نستخدم هذه البيانات حصرياً لمعالجة طلباتك، تحسين تجربة الاستخدام، والتواصل معك بخصوص حالة الطلبات وتحديثات المنتجات.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-gray-800">
            3. حماية الأمان (Security)
          </h2>
          <p className="text-gray-600 leading-relaxed">
            نتخذ كافة التدابير الأمنية المناسبة لحماية بياناتك من الوصول غير المصرح به أو التعديل أو الإفصاح.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-gray-800">
            4. تواصل معنا (Contact Us)
          </h2>
          <p className="text-gray-600 leading-relaxed">
            إذا كان لديك أي استفسار بخصوص سياسة الخصوصية، يمكنك التواصل معنا عبر قنوات الدعم المتاحة داخل التطبيق.
          </p>
        </section>
      </div>
    </div>
  );
}