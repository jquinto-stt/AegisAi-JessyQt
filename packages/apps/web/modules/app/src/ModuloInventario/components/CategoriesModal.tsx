import React, { useState } from "react";
import { Layers, Tag, Check } from "lucide-react";
import { Button, Modal } from "@/elements";

interface CategoriesModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: string[];
  selectedCategory: string;
  onSelectCategory: (cat: string) => void;
}

export const CategoriesModal: React.FC<CategoriesModalProps> = ({
  isOpen,
  onClose,
  categories,
  selectedCategory,
  onSelectCategory,
}) => {
  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      className="max-w-md p-6 rounded-3xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-theme-xl"
    >
      {/* Header */}
      <div className="flex items-center gap-2.5 pb-4 border-b border-gray-100 dark:border-gray-800">
        <div className="w-8 h-8 rounded-xl bg-secondary-600/10 dark:bg-secondary-600/20 flex items-center justify-center text-secondary-600 dark:text-secondary-400">
          <Layers className="w-4 h-4" />
        </div>
        <div>
          <h3 className="font-bold text-gray-900 dark:text-white text-base">
            Categorías de Productos
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">Organiza tu inventario por grupos</p>
        </div>
      </div>

      {/* Content */}
      <div className="py-4 space-y-1.5 max-h-60 overflow-y-auto">
        <button
          type="button"
          onClick={() => {
            onSelectCategory("all");
            onClose();
          }}
          className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            selectedCategory === "all" || !selectedCategory
              ? "bg-secondary-600 text-white shadow-theme-xs"
              : "bg-gray-50 dark:bg-gray-800/60 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
          }`}
        >
          <div className="flex items-center gap-2">
            <Tag className="w-3.5 h-3.5" />
            <span>Todas las Categorías</span>
          </div>
          {(selectedCategory === "all" || !selectedCategory) && <Check className="w-4 h-4" />}
        </button>

        {categories.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => {
              onSelectCategory(cat);
              onClose();
            }}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              selectedCategory === cat
                ? "bg-secondary-600 text-white shadow-theme-xs"
                : "bg-gray-50 dark:bg-gray-800/60 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
            }`}
          >
            <div className="flex items-center gap-2">
              <Tag className="w-3.5 h-3.5 text-gray-400" />
              <span>{cat}</span>
            </div>
            {selectedCategory === cat && <Check className="w-4 h-4" />}
          </button>
        ))}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-end pt-4 border-t border-gray-100 dark:border-gray-800">
        <Button variant="primary" size="sm" onClick={onClose}>
          Cerrar
        </Button>
      </div>
    </Modal>
  );
};
