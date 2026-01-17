import React, { useState, useRef, useEffect } from 'react';

interface Option {
    label: string;
    value: number;
}

interface MultiSelectProps {
    options: Option[];
    selected: number[];
    onChange: (selected: number[]) => void;
    placeholder?: string;
    className?: string;
}

export const MultiSelect: React.FC<MultiSelectProps> = ({
    options,
    selected,
    onChange,
    placeholder = "Select...",
    className = ""
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const toggleOption = (value: number) => {
        let newSelected = [...selected];

        if (newSelected.includes(value)) {
            newSelected = newSelected.filter(v => v !== value);
        } else {
            newSelected.push(value);
        }
        onChange(newSelected);
    };

    const selectedLabels = selected.map(val => {
        if (val === -1) return "Unassigned";
        const opt = options.find(o => o.value === val);
        return opt ? opt.label : String(val);
    });

    return (
        <div className={`relative ${className}`} ref={containerRef}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between px-2 py-1 text-xs border border-gray-300 rounded-md bg-white text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-blue-500 min-w-[140px]"
            >
                <span className="truncate max-w-[120px]">
                    {selected.length === 0
                        ? placeholder
                        : selected.length === 1
                            ? selectedLabels[0]
                            : `${selected.length} selected`}
                </span>
                <span className="ml-2 text-gray-400">▼</span>
            </button>

            {isOpen && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
                    {/* Unassigned Option (Special) */}
                    <div
                        onClick={() => toggleOption(-1)}
                        className="flex items-center px-3 py-2 cursor-pointer hover:bg-gray-50 "
                    >
                        <input
                            type="checkbox"
                            checked={selected.includes(-1)}
                            readOnly
                            className="h-3 w-3 text-gray-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <span className="ml-2 text-xs text-gray-600 font-medium">Unassigned</span>
                    </div>

                    {options.map((option) => (
                        <div
                            key={option.value}
                            onClick={() => toggleOption(option.value)}
                            className="flex items-center px-3 py-2 cursor-pointer hover:bg-gray-50"
                        >
                            <input
                                type="checkbox"
                                checked={selected.includes(option.value)}
                                readOnly
                                className="h-3 w-3 text-gray-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <span className="ml-2 text-xs text-gray-700">{option.label}</span>
                        </div>
                    ))}

                    {options.length === 0 && (
                        <div className="px-3 py-2 text-xs text-gray-400 text-center">No users found</div>
                    )}
                </div>
            )}
        </div>
    );
};
