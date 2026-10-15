import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

interface EmptyStateProps {
  icon?: ReactNode;
  imageUrl?: string; // أضفنا خاصية لتقبل صورة حقيقية
  title: string;
  description?: string;
  actionLabel?: string;
  actionTo?: string;
  onAction?: () => void;
}

export function EmptyState({ icon, imageUrl, title, description, actionLabel, actionTo, onAction }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center bg-white rounded-3xl border border-gray-100 shadow-card my-6">
      {/* عرض صورة سلة حقيقية أو أيقونة حسب المتوفر */}
      {imageUrl ? (
        <div className="mb-6 w-32 h-32 rounded-3xl overflow-hidden bg-primary-50/50 flex items-center justify-center p-4 shadow-sm border border-primary-100/50">
          <img src={imageUrl} alt="Empty State" className="w-full h-full object-contain animate-pulse" />
        </div>
      ) : icon ? (
        <div className="mb-6 w-24 h-24 rounded-3xl bg-primary-50 flex items-center justify-center text-primary-500 shadow-inner">
          {icon}
        </div>
      ) : null}

      <h3 className="text-xl font-extrabold text-gray-900 mb-2">{title}</h3>
      {description && <p className="text-sm text-gray-500 max-w-md mb-8 leading-relaxed">{description}</p>}

      {actionLabel && actionTo && (
        <Link
          to={actionTo}
          className="inline-flex items-center px-8 py-3.5 bg-primary-500 hover:bg-primary-600 text-white text-sm font-extrabold rounded-2xl shadow-lg shadow-primary-500/25 transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer"
        >
          {actionLabel}
        </Link>
      )}

      {actionLabel && onAction && !actionTo && (
        <button
          onClick={onAction}
          className="inline-flex items-center px-8 py-3.5 bg-primary-500 hover:bg-primary-600 text-white text-sm font-extrabold rounded-2xl shadow-lg shadow-primary-500/25 transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({ message = 'Something went wrong', onRetry }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center bg-white rounded-3xl border border-gray-100 shadow-card my-6">
      <div className="mb-4 w-20 h-20 rounded-2xl bg-red-50 flex items-center justify-center">
        <svg className="w-10 h-10 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
        </svg>
      </div>
      <p className="text-sm font-bold text-gray-700 mb-4">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="inline-flex items-center px-6 py-3 bg-gray-100 text-gray-700 text-xs font-bold rounded-2xl hover:bg-gray-200 transition-colors cursor-pointer"
        >
          Try Again
        </button>
      )}
    </div>
  );
}