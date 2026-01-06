'use client';

import { useState, useRef, useEffect } from 'react';

interface Status {
  id: number;
  name: string;
  color: string;
}

interface StatusSelectProps {
  statuses: Status[];
  value: number;
  currentColor: string;
  onChange: (statusId: number) => void;
  className?: string;
}

export default function StatusSelect({ statuses, value, currentColor, onChange, className = '' }: StatusSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedStatus = statuses.find((s) => s.id === value);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (statusId: number) => {
    onChange(statusId);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Trigger button */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className="w-full flex items-center justify-center gap-1.5 px-2 py-1 rounded text-xs text-white"
        style={{ backgroundColor: currentColor }}
      >
        <span className="truncate">{selectedStatus?.name || '-'}</span>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div
          className="absolute z-50 mt-1 w-40 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Status list */}
          <div className="max-h-60 overflow-y-auto py-1">
            {statuses.map((status) => (
              <button
                key={status.id}
                type="button"
                onClick={() => handleSelect(status.id)}
                className={`w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-gray-100 ${
                  value === status.id ? 'bg-[#f0f9f4]' : ''
                }`}
              >
                <span
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: status.color }}
                />
                <span className="text-sm text-gray-700">{status.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
