// مكدّس "طبقات" قابلة للإغلاق بزر الرجوع (نوافذ، قوائم، صور مكبّرة...)
// آخر طبقة اتفتحت هي أول واحدة تتقفل لما المستخدم يضغط رجوع.

type Handler = () => void;

const stack: Handler[] = [];

export function pushBackLayer(handler: Handler): () => void {
  stack.push(handler);
  return () => {
    const i = stack.lastIndexOf(handler);
    if (i >= 0) stack.splice(i, 1);
  };
}

// بترجع true لو في طبقة اتقفلت (يعني زر الرجوع اتستهلك)
export function closeTopLayer(): boolean {
  const top = stack[stack.length - 1];
  if (!top) return false;
  top();
  return true;
}