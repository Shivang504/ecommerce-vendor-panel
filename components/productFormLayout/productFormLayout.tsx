import { ArrowLeft, Package } from 'lucide-react';
import { title } from 'process';
import React, { useState } from 'react';

interface TabItem {
  id: string;
  label: string;
  icon: React.ElementType;
  content: React.ReactNode;
}

interface ProductFormLayoutProps {
  tabs: TabItem[];
  title?: string;
  onclick?: () => void;
}

const ProductFormLayout = ({ tabs, title, onclick }: ProductFormLayoutProps) => {
  const [activeTab, setActiveTab] = useState(tabs[0]?.id);

  return (
    <div className='min-h-screen bg-gray-50 p-4 md:p-6 lg:p-8'>
      <div className='max-w-7xl mx-auto'>
        {/* Header */}
        <div className='bg-white rounded-lg shadow-sm p-4 md:p-6 mb-6'>
          <div className='flex items-center gap-4'>
            <div onClick={onclick} className='cursor-pointer'>
              <ArrowLeft className='h-5 w-5' />
            </div>
            <h1 className='text-3xl font-bold text-slate-900 dark:text-white'>{title}</h1>
          </div>
        </div>

        <div className='grid grid-cols-1 lg:grid-cols-12 gap-6'>
          {/* Sidebar */}
          <div className='lg:col-span-3'>
            <div className='bg-white rounded-lg shadow-sm p-2 space-y-1'>
              {tabs.map(tab => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition ${
                      activeTab === tab.id ? 'bg-orange-50 text-orange-600 font-medium' : 'text-gray-700 hover:bg-gray-50'
                    }`}>
                    <Icon className='w-5 h-5' />
                    <span className='text-sm md:text-base'>{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Main content */}
          <div className='lg:col-span-9'>
            <div className='bg-white rounded-lg shadow-sm p-6 md:p-8'>{tabs.find(t => t.id === activeTab)?.content}</div>

            {/* Action Buttons */}
            <div className='flex flex-col sm:flex-row gap-3 mt-6'>
              <button className='px-6 py-3 bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600 transition'>
                Save Product
              </button>
              <button className='px-6 py-3 bg-white text-gray-700 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition'>
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductFormLayout;
