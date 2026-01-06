'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';

interface User {
  id: number;
  name: string;
}

interface UserSelectProps {
  users: User[];
  value: number | null;
  onChange: (userId: number | null) => void;
  className?: string;
}

export default function UserSelect({ users, value, onChange, className = '' }: UserSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedUser = users.find((u) => u.id === value);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearch('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus input when dropdown opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const filteredUsers = users.filter((user) =>
    user.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = (userId: number | null) => {
    onChange(userId);
    setIsOpen(false);
    setSearch('');
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
        className="w-full flex items-center gap-1.5 px-1.5 py-1 border border-gray-200 rounded bg-white hover:border-gray-400 text-left text-xs"
      >
        {selectedUser ? (
          <>
            <Image
              src={`/api/users/${selectedUser.id}/icon`}
              alt={selectedUser.name}
              width={20}
              height={20}
              className="rounded-full flex-shrink-0"
              unoptimized
            />
            <span className="truncate text-gray-700">{selectedUser.name}</span>
          </>
        ) : (
          <span className="text-gray-400">-</span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div
          className="absolute z-50 mt-1 w-56 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Search input */}
          <div className="p-2 border-b">
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="検索..."
              className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm focus:outline-none focus:border-[#42b983]"
            />
          </div>

          {/* User list */}
          <div className="max-h-60 overflow-y-auto">
            {/* Unassign option */}
            <button
              type="button"
              onClick={() => handleSelect(null)}
              className={`w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-gray-100 ${
                value === null ? 'bg-[#f0f9f4]' : ''
              }`}
            >
              <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-gray-400 text-xs flex-shrink-0">
                -
              </div>
              <span className="text-sm text-gray-500">未設定</span>
            </button>

            {filteredUsers.map((user) => (
              <button
                key={user.id}
                type="button"
                onClick={() => handleSelect(user.id)}
                className={`w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-gray-100 ${
                  value === user.id ? 'bg-[#f0f9f4]' : ''
                }`}
              >
                <Image
                  src={`/api/users/${user.id}/icon`}
                  alt={user.name}
                  width={24}
                  height={24}
                  className="rounded-full flex-shrink-0"
                  unoptimized
                />
                <span className="text-sm text-gray-700 truncate">{user.name}</span>
              </button>
            ))}

            {filteredUsers.length === 0 && (
              <div className="px-3 py-4 text-center text-sm text-gray-400">
                該当するユーザーがいません
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
