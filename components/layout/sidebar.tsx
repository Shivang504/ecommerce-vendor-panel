'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { useSettings } from '@/components/settings/settings-provider';
import {
  LogOut,
  LayoutDashboard,
  Package,
  Tag,
  Store,
  Users,
  Search,
  ChevronLeft,
  ChevronRight,
  Settings,
  ChevronDown,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Ticket,
  FileText,
  Image,
  BookOpen,
  FileCheck,
  Truck,
  RotateCcw,
  X,
  ImageIcon,
  Star,
  ShoppingCart,
  CreditCard,
  MessageCircle,
  Wallet,
  Warehouse as WarehouseIcon,
  BarChart3,
} from 'lucide-react';


export function Sidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { settings, loading } = useSettings();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(true);
  const [vendorsOpen, setVendorsOpen] = useState(pathname.startsWith('/admin/vendors'));
  const [pendingVendorCount, setPendingVendorCount] = useState(0);
  const [usersOpen, setUsersOpen] = useState(pathname.startsWith('/admin/users') || pathname.startsWith('/admin/roles'));
  const [productsOpen, setProductsOpen] = useState(
    pathname.startsWith('/admin/products') ||
      pathname.startsWith('/admin/attributes') ||
      pathname.startsWith('/admin/categories') ||
      pathname.startsWith('/admin/subcategories') ||
      pathname.startsWith('/admin/child-categories') ||
      pathname.startsWith('/admin/brands') ||
      pathname.startsWith('/admin/tags')
  );
  const [cmsOpen, setCmsOpen] = useState(
    pathname.startsWith('/admin/cms') ||
      pathname.startsWith('/admin/banners') ||
      pathname.startsWith('/admin/policies') ||
      pathname.startsWith('/admin/blog')
  );
  const [userData, setUserData] = useState<{
    name: string;
    email: string;
    role?: string;
  } | null>(null);

  useEffect(() => {
    setMounted(true);
    const savedOpen = localStorage.getItem('sidebarOpen') !== 'false';
    setIsOpen(savedOpen);

    const userStr = localStorage.getItem('adminUser');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        setUserData(user);
        console.log('[v0] User data loaded:', user.name);
      } catch (error) {
        console.error('[v0] Error parsing user data:', error);
      }
    }

    const fetchPendingVendorCount = async () => {
      try {
        const userStr = localStorage.getItem('adminUser');
        if (userStr) {
          try {
            const u = JSON.parse(userStr);
            if (u?.role === 'vendor') return;
          } catch {
            /* ignore */
          }
        }
        const token = localStorage.getItem('adminToken');
        const response = await fetch('/api/admin/vendors?status=pending', {
          headers: {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` }),
          },
          credentials: 'include',
        });
        const data = await response.json();
        setPendingVendorCount(data.vendors?.filter((v: any) => v.status === 'pending').length || 0);
      } catch (error) {
        console.error('[v0] Failed to fetch pending vendors:', error);
      }
    };

    fetchPendingVendorCount();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    router.push('/login');
  };

  const toggleSidebar = () => {
    const newState = !isOpen;
    setIsOpen(newState);
    localStorage.setItem('sidebarOpen', String(newState));
  };

  const primaryColor = settings.primaryColor || '#22C55E';
  const accentColor = settings.accentColor || '#16A34A';

  const brandBadgeStyle = useMemo(
    () => ({
      background: `${primaryColor}`,
    }),
    [primaryColor, accentColor]
  );

  const menuItems = [
    { label: 'Dashboard', href: '/admin', badge: null, icon: LayoutDashboard, allowedRoles: ['superadmin', 'admin', 'vendor'] },
    {
      label: 'Products',
      href: '/admin/products',
      badge: null,
      icon: Package,
      submenu: true,
      type: 'products',
      allowedRoles: ['superadmin', 'admin', 'vendor'],
    },
    { label: 'Orders', href: '/admin/orders', badge: null, icon: ShoppingCart, allowedRoles: ['superadmin', 'admin', 'vendor'] },
    { label: 'Wallet', href: '/admin/wallet', badge: null, icon: Wallet, allowedRoles: ['vendor'] },
    {
      label: 'Vendor Reports & Analytics',
      href: '/admin/vendor-reports',
      badge: null,
      icon: BarChart3,
      allowedRoles: ['vendor'],
    },
    { label: 'Payments', href: '/admin/payments', badge: null, icon: CreditCard, allowedRoles: ['superadmin', 'admin'] },
    { label: 'Warehouses', href: '/admin/warehouses', badge: null, icon: WarehouseIcon, allowedRoles: ['superadmin', 'admin'] },
    { label: 'Support Tickets', href: '/admin/support/tickets', badge: null, icon: Ticket, allowedRoles: ['superadmin', 'admin'] },
    { label: 'Live Chat', href: '/admin/chat', badge: null, icon: MessageCircle, allowedRoles: ['superadmin', 'admin'] },
    { label: 'Coupons', href: '/admin/coupons', badge: null, icon: Ticket, allowedRoles: ['superadmin', 'admin', 'vendor'] },
    {
      label: 'Users',
      href: '/admin/users',
      badge: null,
      icon: Users,
      submenu: true,
      type: 'users',
      allowedRoles: ['superadmin', 'admin', 'vendor'],
    },
    { label: 'Customers', href: '/admin/customers', badge: null, icon: Users, allowedRoles: ['superadmin', 'admin'] },
    { label: 'Reviews', href: '/admin/reviews', badge: null, icon: Star, allowedRoles: ['superadmin', 'admin', 'vendor'] },
    {
      label: 'Vendors',
      href: '/admin/vendors',
      badge: null,
      icon: Store,
      submenu: true,
      type: 'vendors',
      allowedRoles: ['superadmin', 'admin'],
    },
    { label: 'Withdrawals', href: '/admin/withdrawals', badge: null, icon: Wallet, allowedRoles: ['superadmin', 'admin'] },
    {
      label: 'Reports & Analytics',
      href: '/admin/seo',
      badge: null,
      icon: Search,
      allowedRoles: ['superadmin', 'admin', 'vendor'],
    },
    {
      label: 'CMS',
      href: '/admin/cms',
      badge: null,
      icon: FileText,
      submenu: true,
      type: 'cms',
      allowedRoles: ['superadmin', 'admin'],
    },
    {
      label: 'Settings',
      href: '/admin/settings',
      badge: null,
      icon: Settings,
      allowedRoles: ['superadmin', 'admin'],
    },
  ];

  // Filter menu items based on user role
  const filteredMenuItems = menuItems.filter(item => {
    const userRole = userData?.role || 'admin';
    return item.allowedRoles?.includes(userRole);
  });

  const vendorSubmenu = [
    {
      label: 'Add Vendor',
      href: '/admin/vendors/add',
    },
    {
      label: 'All Vendors',
      href: '/admin/vendors',
    },
    {
      label: 'Approved',
      href: '/admin/vendors?status=approved',
    },
    {
      label: 'Pending',
      href: '/admin/vendors?status=pending',
    },
    {
      label: 'Rejected',
      href: '/admin/vendors?status=rejected',
    },
    {
      label: 'Suspended',
      href: '/admin/vendors?status=suspended',
    },
  ];

  const usersSubmenu = [
    {
      label: 'Add User',
      href: '/admin/users/add',
    },
    {
      label: 'All Users',
      href: '/admin/users',
    },
    {
      label: 'Role',
      href: '/admin/roles',
    },
  ];

  const [categoryPosition, setCategoryPosition] = useState<number | null>(null);
  const [subcategoryPosition, setSubcategoryPosition] = useState<number | null>(null);
  const [childCategoryPosition, setChildCategoryPosition] = useState<number | null>(null);

  useEffect(() => {
    // Fetch positions for categories, subcategories, and child categories
    const fetchPositions = async () => {
      try {
        // Fetch category position count
        const token = localStorage.getItem('adminToken');
        const catResponse = await fetch('/api/admin/categories', {
          headers: {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` }),
          },
          credentials: 'include',
        });
        if (catResponse.ok) {
          const catData = await catResponse.json();
          const categories = Array.isArray(catData.categories) ? catData.categories : [];
          const maxCatPosition = categories.length > 0 
            ? Math.max(...categories.map((cat: any) => cat.position || 0), 0)
            : 0;
          setCategoryPosition(maxCatPosition + 1);
        }

        // Fetch subcategory position count
        const subcatResponse = await fetch('/api/admin/subcategories', {
          headers: {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` }),
          },
          credentials: 'include',
        });
        if (subcatResponse.ok) {
          const subcatData = await subcatResponse.json();
          const subcategories = Array.isArray(subcatData.subcategories) ? subcatData.subcategories : [];
          const maxSubcatPosition = subcategories.length > 0
            ? Math.max(...subcategories.map((subcat: any) => subcat.position || 0), 0)
            : 0;
          setSubcategoryPosition(maxSubcatPosition + 1);
        }

        // Fetch child category position count
        const childResponse = await fetch('/api/admin/child-categories', {
          headers: {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` }),
          },
          credentials: 'include',
        });
        if (childResponse.ok) {
          const childData = await childResponse.json();
          const childCategories = Array.isArray(childData.childCategories) ? childData.childCategories : [];
          const maxChildPosition = childCategories.length > 0
            ? Math.max(...childCategories.map((child: any) => child.position || 0), 0)
            : 0;
          setChildCategoryPosition(maxChildPosition + 1);
        }
      } catch (error) {
        console.error('Failed to fetch positions:', error);
      }
    };

    if (mounted) {
      fetchPositions();
    }
  }, [mounted]);

  const productsSubmenu = [
    {
      label: 'Add Product',
      href: '/admin/products/add',
    },
    {
      label: 'All Products',
      href: '/admin/products',
    },
    {
      label: 'Attributes',
      href: '/admin/attributes',
    },
    {
      label: 'Category',
      href: '/admin/categories',
      showPosition: true,
      position: categoryPosition,
      hideForVendor: true,
    },
    {
      label: 'Subcategory',
      href: '/admin/subcategories',
      showPosition: true,
      position: subcategoryPosition,
      hideForVendor: true,
    },
    {
      label: 'Child Category',
      href: '/admin/child-categories',
      showPosition: true,
      position: childCategoryPosition,
      hideForVendor: true,
    },
    {
      label: 'Position',
      href: '/admin/positions',
      hideForVendor: true,
    },
    {
      label: 'Brand',
      href: '/admin/brands',
      hideForVendor: true,
    },
    {
      label: 'Tag',
      href: '/admin/tags',
      hideForVendor: true,
    },
  ];

  // Filter productsSubmenu based on user role
  const filteredProductsSubmenu = useMemo(() => {
    const userRole = userData?.role || 'admin';
    if (userRole === 'vendor') {
      return productsSubmenu.filter(item => !item.hideForVendor);
    }
    return productsSubmenu;
  }, [userData?.role]);

  const cmsSubmenu = [
    {
      label: 'Hero Banners',
      href: '/admin/cms/hero-banners',
    },
    {
      label: 'Quality Banners',
      href: '/admin/cms/quality-banners',
    },
    {
      label: 'Seasonal Banners',
      href: '/admin/cms/seasonal-banners',
    },
    {
      label: 'Monthly Banners',
      href: '/admin/cms/monthly-banners',
    },
    {
      label: 'Testimonial Slides',
      href: '/admin/cms/testimonial-slides',
    },
    {
      label: 'Promo Section',
      href: '/admin/cms/promo-section',
    },
    {
      label: 'Privacy Policy',
      href: '/admin/cms/privacy-policy',
    },
    {
      label: 'Terms & Conditions',
      href: '/admin/cms/terms-conditions',
    },
    {
      label: 'Refund & Return Policy',
      href: '/admin/cms/refund-return',
    },
    {
      label: 'Cancellation Policy',
      href: '/admin/cms/cancellation',
    },
    {
      label: 'Shipping Policy',
      href: '/admin/cms/shipping',
    },
    {
      label: 'Blog',
      href: '/admin/cms/blog',
    },
    {
      label: 'Footer Pages',
      href: '/admin/cms/footer-pages',
    },
    {
      label: 'SEO Settings',
      href: '/admin/cms/seo',
    },
  ];

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const brandName = settings.siteName || 'E-commerce';
  const brandLogo = settings.logo;
  const brandInitials = useMemo(() => getInitials(brandName), [brandName]);

  if (!mounted) {
    return null;
  }

  return (
    <aside
      className={`${isOpen ? 'w-64' : 'w-20'} min-h-screen flex flex-col transition-all duration-300 bg-white border-r border-gray-200`}>
      <div className='p-4 flex items-center justify-between border-gray-200'>
        {isOpen ? (
          <>
            <div className='flex items-center gap-2.5'>
              <div
                className='w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-base overflow-hidden'
                >
                {loading ? <div className='w-full h-full animate-pulse bg-gray-200' /> : null}

                {brandLogo ? (
                  <img
                    src={brandLogo}
                    alt={brandName}
                    className={`h-full w-full object-contain transition-opacity duration-300 ${loading ? 'opacity-0' : 'opacity-100'}`}
                  />
                ) : (
                  !loading && <span>{brandInitials}</span>
                )}
              </div>
              {loading ? (
                <div className='h-4 w-24 bg-gray-200 rounded animate-pulse' />
              ) : (
                <span className='text-gray-900 font-bold text-base truncate'>{brandName}</span>
              )}{' '}
            </div>
            <button onClick={toggleSidebar} className='p-1.5 rounded-lg hover:bg-gray-50 transition-colors' aria-label='Collapse sidebar'>
              <ChevronLeft className='w-5 h-5 text-gray-600' />
            </button>
          </>
        ) : (
          <button onClick={toggleSidebar} className='w-full flex flex-col items-center gap-2' aria-label='Expand sidebar'>
            <div
              className='w-9 h-9 rounded-lg flex items-center justify-center text-white font-bold text-base overflow-hidden relative'
             >
              {/* Skeleton Loader */}
              {loading && <div className='absolute inset-0 bg-gray-200 animate-pulse' />}

              {brandLogo ? (
                <img
                  src={brandLogo}
                  alt={brandName}
                  className={`h-full w-full object-contain transition-opacity duration-300 ${loading ? 'opacity-0' : 'opacity-100'}`}
                />
              ) : (
                !loading && <span>{brandInitials}</span>
              )}
            </div>

            <ChevronRight className='w-4 h-4 text-gray-600' />
          </button>
        )}
      </div>

      {isOpen && <div className='px-4 py-2 text-xs font-bold text-gray-600 uppercase tracking-wider'>MENU</div>}

      <nav className='flex-1 px-3 py-2 space-y-1 overflow-y-auto'>
        {filteredMenuItems.map(item => {
          const isActive = item.href === '/admin' ? pathname === '/admin' : pathname === item.href || pathname.startsWith(item.href + '/');
          const IconComponent = item.icon;

          if (item.submenu && item.type === 'vendors') {
            return (
              <div key={item.href} className='relative'>
                <button
                  onClick={() => {
                    if (isOpen) {
                      setVendorsOpen(!vendorsOpen);
                    }
                  }}
                  className={`w-full relative flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-200 group ${
                    isOpen ? '' : 'justify-center'
                  } ${pathname.startsWith('/admin/vendors') ? 'text-white font-medium' : 'text-gray-700 hover:bg-gray-50'}`}
                  style={
                    pathname.startsWith('/admin/vendors')
                      ? {
                          backgroundColor: primaryColor,
                        }
                      : undefined
                  }
                  title={!isOpen ? item.label : undefined}>
                  <IconComponent className='w-5 h-5 flex-shrink-0' />

                  {isOpen && (
                    <>
                      <span className=' truncate text-sm'>{item.label}</span>

                      {pendingVendorCount > 0 && (
                        <Badge className='bg-red-500 hover:bg-red-600 text-white px-2 py-0.5 text-xs font-bold rounded-full flex-shrink-0'>
                          {pendingVendorCount}
                        </Badge>
                      )}

                      <ChevronDown className={`w-4 h-4 flex-shrink-0 transition-transform ${vendorsOpen ? 'rotate-180' : ''}`} />
                    </>
                  )}
                </button>

                {isOpen && vendorsOpen && (
                  <div className='mt-2 space-y-0 relative pl-4'>
                    <div className='absolute left-0 top-0 bottom-0 w-0.5 border-l-2 border-dashed' style={{ borderColor: primaryColor }}></div>
                    {vendorSubmenu.map((subItem, index) => {
                      const subHref = subItem.href.split('?')[0];
                      const subParams = subItem.href.includes('?') ? subItem.href.split('?')[1] : '';
                      const currentStatus = searchParams.get('status') || '';

                      let isSubActive = false;
                      if (subItem.href.includes('?status=')) {
                        const statusParam = subItem.href.split('status=')[1];
                        isSubActive = pathname === subHref && currentStatus === statusParam;
                      } else {
                        isSubActive = pathname === subHref && !currentStatus;
                      }

                      return (
                        <Link
                          key={subItem.href}
                          href={subItem.href}
                          className={`relative flex items-center gap-3 py-2.5 pl-6 transition-all duration-200 text-sm font-medium ${
                            isSubActive 
                              ? 'text-gray-900 font-semibold' 
                              : 'text-gray-600 hover:text-gray-900'
                          }`}
                          style={isSubActive ? { color: primaryColor } : undefined}>
                          <div className='absolute left-0 top-1/2 -translate-y-1/2 w-3 h-0.5' style={{ backgroundColor: primaryColor }}></div>
                          <span className='flex-1 truncate text-left'>{subItem.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }

          if (item.submenu && item.type === 'users') {
            return (
              <div key={item.href} className='relative'>
                <button
                  onClick={() => {
                    if (isOpen) {
                      setUsersOpen(!usersOpen);
                    }
                  }}
                  className={`w-full relative flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-200 group ${
                    isOpen ? '' : 'justify-center'
                  } ${
                    pathname.startsWith('/admin/users') || pathname.startsWith('/admin/roles')
                      ? 'text-white font-medium'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                  style={
                    pathname.startsWith('/admin/users') || pathname.startsWith('/admin/roles')
                      ? {
                          backgroundColor: primaryColor,
                        }
                      : undefined
                  }
                  title={!isOpen ? item.label : undefined}>
                  <IconComponent className='w-5 h-5 flex-shrink-0' />

                  {isOpen && (
                    <>
                      <span className=' truncate text-sm'>{item.label}</span>
                      <ChevronDown className={`w-4 h-4 flex-shrink-0 transition-transform ${usersOpen ? 'rotate-180' : ''}`} />
                    </>
                  )}
                </button>

                {isOpen && usersOpen && (
                  <div className='mt-2 space-y-0 relative pl-4'>
                    <div className='absolute left-0 top-0 bottom-0 w-0.5 border-l-2 border-dashed' style={{ borderColor: primaryColor }}></div>
                    {usersSubmenu.map((subItem, index) => {
                      const isSubActive = pathname === subItem.href;

                      return (
                        <Link
                          key={subItem.href}
                          href={subItem.href}
                          className={`relative flex items-center gap-3 py-2.5 pl-6 transition-all duration-200 text-sm font-medium ${
                            isSubActive 
                              ? 'text-gray-900 font-semibold' 
                              : 'text-gray-600 hover:text-gray-900'
                          }`}
                          style={isSubActive ? { color: primaryColor } : undefined}>
                          <div className='absolute left-0 top-1/2 -translate-y-1/2 w-3 h-0.5' style={{ backgroundColor: primaryColor }}></div>
                          <span className='flex-1 truncate text-left'>{subItem.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }

          if (item.submenu && item.type === 'products') {
            const isProductsActive =
              pathname.startsWith('/admin/products') ||
              pathname.startsWith('/admin/attributes') ||
              pathname.startsWith('/admin/categories') ||
              pathname.startsWith('/admin/subcategories') ||
              pathname.startsWith('/admin/child-categories') ||
              pathname.startsWith('/admin/positions') ||
              pathname.startsWith('/admin/brands') ||
              pathname.startsWith('/admin/tags');
            return (
              <div key={item.href} className='relative'>
                <button
                  onClick={() => {
                    if (isOpen) setProductsOpen(!productsOpen);
                  }}
                  className={`w-full relative flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-200 group ${
                    isOpen ? '' : 'justify-center'
                  } ${isProductsActive ? 'text-white font-medium' : 'text-gray-700 hover:bg-gray-50'}`}
                  style={
                    isProductsActive
                      ? {
                          backgroundColor: primaryColor,
                        }
                      : undefined
                  }
                  title={!isOpen ? item.label : undefined}>
                  <IconComponent className='w-5 h-5 flex-shrink-0' />
                  {isOpen && (
                    <>
                      <span className=' truncate text-sm'>{item.label}</span>
                      <ChevronDown className={`w-4 h-4 flex-shrink-0 transition-transform ${productsOpen ? 'rotate-180' : ''}`} />
                    </>
                  )}
                </button>

                {isOpen && productsOpen && (
                  <div className='mt-2 space-y-0 relative pl-4'>
                    <div className='absolute left-0 top-0 bottom-0 w-0.5 border-l-2 border-dashed' style={{ borderColor: primaryColor }}></div>
                    {filteredProductsSubmenu.map((subItem, index) => {
                      const isSubActive = subItem.href === '/admin/products' ? pathname === '/admin/products' : pathname === subItem.href;

                      return (
                        <Link
                          key={subItem.href}
                          href={subItem.href}
                          className={`relative flex items-center justify-between gap-3 py-2.5 pl-6 transition-all duration-200 text-sm font-medium ${
                            isSubActive 
                              ? 'text-gray-900 font-semibold' 
                              : 'text-gray-600 hover:text-gray-900'
                          }`}
                          style={isSubActive ? { color: primaryColor } : undefined}>
                          <div className='absolute left-0 top-1/2 -translate-y-1/2 w-3 h-0.5' style={{ backgroundColor: primaryColor }}></div>
                          <span className='flex-1 truncate text-left'>{subItem.label}</span>
                          {subItem.showPosition && subItem.position !== null && (
                            <Badge 
                              variant="secondary" 
                              className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 font-normal"
                            >
                              Pos: {subItem.position}
                            </Badge>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }

          if (item.submenu && item.type === 'cms') {
            const isCmsActive =
              pathname.startsWith('/admin/cms') ||
              pathname.startsWith('/admin/banners') ||
              pathname.startsWith('/admin/policies') ||
              pathname.startsWith('/admin/blog');
            return (
              <div key={item.href} className='relative'>
                <button
                  onClick={() => {
                    if (isOpen) setCmsOpen(!cmsOpen);
                  }}
                  className={`w-full relative flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-200 group ${
                    isOpen ? '' : 'justify-center'
                  } ${isCmsActive ? 'text-white font-medium' : 'text-gray-700 hover:bg-gray-50'}`}
                  style={
                    isCmsActive
                      ? {
                          backgroundColor: primaryColor,
                        }
                      : undefined
                  }
                  title={!isOpen ? item.label : undefined}>
                  <IconComponent className='w-5 h-5 flex-shrink-0' />
                  {isOpen && (
                    <>
                      <span className=' truncate text-sm'>{item.label}</span>
                      <ChevronDown className={`w-4 h-4 flex-shrink-0 transition-transform ${cmsOpen ? 'rotate-180' : ''}`} />
                    </>
                  )}
                </button>

                {isOpen && cmsOpen && (
                  <div className='mt-2 space-y-0 relative pl-4'>
                    <div className='absolute left-0 top-0 bottom-0 w-0.5 border-l-2 border-dashed' style={{ borderColor: primaryColor }}></div>
                    {cmsSubmenu.map((subItem) => {
                      const isSubActive = pathname === subItem.href || pathname.startsWith(subItem.href + '/');

                      return (
                        <Link
                          key={subItem.href}
                          href={subItem.href}
                          className={`relative flex items-center gap-3 py-2.5 pl-6 transition-all duration-200 text-sm font-medium ${
                            isSubActive 
                              ? 'text-gray-900 font-semibold' 
                              : 'text-gray-600 hover:text-gray-900'
                          }`}
                          style={isSubActive ? { color: primaryColor } : undefined}>
                          <div className='absolute left-0 top-1/2 -translate-y-1/2 w-3 h-0.5' style={{ backgroundColor: primaryColor }}></div>
                          <span className='flex-1 truncate text-left'>{subItem.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`relative flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-200 group ${
                isOpen ? '' : 'justify-center'
              } ${isActive ? 'text-white font-medium' : 'text-gray-700 hover:bg-gray-50'}`}
              style={
                isActive
                  ? {
                      backgroundColor: primaryColor,
                    }
                  : undefined
              }
              title={!isOpen ? item.label : undefined}>
              <IconComponent className='w-5 h-5 flex-shrink-0' />

              {isOpen && (
                <>
                  <span className='flex-1 truncate text-sm'>{item.label}</span>

                  {item.badge && (
                    <Badge className='ml-auto bg-red-500 hover:bg-red-600 text-white px-2 py-0.5 text-xs font-bold rounded-full flex-shrink-0'>
                      {item.badge}
                    </Badge>
                  )}
                </>
              )}
            </Link>
          );
        })}
      </nav>

      <div className='p-3 border-t border-gray-200'>
        <div
          className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all
    ${isOpen ? 'bg-gray-50 hover:bg-gray-50' : 'hover:bg-gray-50'}
  `}>
          {/* Profile Avatar */}
          <div
            className='w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm '
            style={brandBadgeStyle}>
            {userData ? getInitials(userData.name) : brandInitials}
          </div>

          {isOpen && (
            <div className='flex-1 min-w-0 cursor-pointer'>
              <p className='text-sm font-semibold text-gray-900 truncate'>{userData?.name || 'Admin'}</p>

              <button
                onClick={handleLogout}
                className='flex items-center gap-2 text-xs cursor-pointer text-gray-600 hover:text-red-600 font-medium transition-colors'>
                <LogOut className='w-3.5 h-3.5' />
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
