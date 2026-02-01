
import React from 'react';

interface CardProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
  className?: string;
  action?: React.ReactNode;
  noPadding?: boolean;
}

const Card: React.FC<CardProps> = ({ children, title, description, className = '', action, noPadding = false }) => {
  return (
    <div className={`group rounded-lg border border-gray-200 bg-white hover:border-gray-300 transition-colors ${className}`}>
      {(title || description || action) && (
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <div>
            {title && <h3 className="text-base font-semibold text-gray-900 leading-none">{title}</h3>}
            {description && <p className="mt-1.5 text-sm text-gray-500">{description}</p>}
          </div>
          {action && <div>{action}</div>}
        </div>
      )}
      <div className={noPadding ? 'p-0' : 'p-6'}>{children}</div>
    </div>
  );
};

export default Card;
