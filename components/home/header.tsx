'use client';
import { Search, User, ShoppingBag, ChevronDown, Menu, X, Heart, LogOut, Package, GitCompare } from 'lucide-react';
import { useSettings } from '@/components/settings/settings-provider';
import Link from 'next/link';
import { useState, useRef, useEffect, useMemo } from 'react';
import SearchBar from '../searchBar/searchBar';
import { AuthModals } from '@/components/auth/auth-modals';
import { usePathname, useRouter } from 'next/navigation';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { toast } from '@/hooks/use-toast';
import { apiClient } from '@/lib/apiClient';

interface ChildCategory {
  _id: string;
  name: string;
  slug: string;
  subcategoryId: string;
  categoryId: string;
}

interface Subcategory {
  _id: string;
  name: string;
  slug: string;
  categoryId: string;
  childCategories: ChildCategory[];
}

interface Category {
  _id: string;
  name: string;
  slug: string;
  parentId?: string | null;
  children?: Category[];
  subcategories?: Subcategory[];
}

export default function HomeHeader() {
  const { settings } = useSettings();
  const siteName = settings.siteName || 'AMAZING';
  const logo = settings.logo;
  const pathname = usePathname();
  const router = useRouter();

  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileDropdownOpen, setMobileDropdownOpen] = useState<number | null>(null);

  const [searchValue, setSearchValue] = useState('');
  const [category, setCategory] = useState('All Categories');
  const [categories, setCategories] = useState<string[]>(['All Categories']);
  const [categoryList, setCategoryList] = useState<Category[]>([]);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [categoriesLoading, setCategoriesLoading] = useState(true);

  const [openLogin, setOpenLogin] = useState(false);
  const [openRegister, setOpenRegister] = useState(false);
  const [customer, setCustomer] = useState<any>(null);
  const [mounted, setMounted] = useState(false);
  const [wishlistCount, setWishlistCount] = useState(0);
  const [cartCount, setCartCount] = useState(0);
  const [comparisonCount, setComparisonCount] = useState(0);

  const [isScrolled, setIsScrolled] = useState(false);
  const [headerHeight, setHeaderHeight] = useState(0);
  const [navBottom, setNavBottom] = useState(0);
  const [dropdownPositions, setDropdownPositions] = useState<{ [key: number]: { left?: number; right?: number } }>({});
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const headerRef = useRef<HTMLElement | null>(null);
  const navRef = useRef<HTMLElement | null>(null);
  const dropdownRefs = useRef<{ [key: number]: HTMLDivElement | null }>({});
  const closeDropdownTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Check customer login status
  useEffect(() => {
    setMounted(true);
    const customerData = localStorage.getItem('currentCustomer');
    if (customerData) {
      try {
        setCustomer(JSON.parse(customerData));
      } catch (error) {
        console.error('Error parsing customer data:', error);
      }
    }
  }, []);

  // Listen for storage changes (when login happens)
  useEffect(() => {
    const handleStorageChange = () => {
      const customerData = localStorage.getItem('currentCustomer');
      if (customerData) {
        try {
          setCustomer(JSON.parse(customerData));
        } catch (error) {
          console.error('Error parsing customer data:', error);
        }
      } else {
        setCustomer(null);
        setWishlistCount(0);
        setCartCount(0);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    // Also listen to custom event for same-tab updates
    window.addEventListener('customerLogin', handleStorageChange);
    // Listen for profile updates
    window.addEventListener('customerProfileUpdated', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('customerLogin', handleStorageChange);
      window.removeEventListener('customerProfileUpdated', handleStorageChange);
    };
  }, []);

  // Listen for open customer login modal event (from Add to Cart, etc.)
  useEffect(() => {
    const handleOpenLogin = () => {
      setOpenLogin(true);
    };

    window.addEventListener('openCustomerLogin', handleOpenLogin);

    return () => {
      window.removeEventListener('openCustomerLogin', handleOpenLogin);
    };
  }, []);

  // Fetch wishlist count
  const fetchWishlistCount = async () => {
    try {
      const response = await fetch('/api/wishlist/count', {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setWishlistCount(data.count || 0);
      }
    } catch (error) {
      // Silently fail if not authenticated
      setWishlistCount(0);
    }
  };

  // Fetch cart count
  const fetchCartCount = async () => {
    try {
      const customerToken = localStorage.getItem('customerToken');
      if (!customerToken) {
        setCartCount(0);
        return;
      }

      const response = await fetch('/api/cart/count', {
        headers: {
          Authorization: `Bearer ${customerToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        const count = Number(data.count) || 0;
        setCartCount(count > 0 ? count : 0);
      } else {
        setCartCount(0);
      }
    } catch (error) {
      // Silently fail if not authenticated
      setCartCount(0);
    }
  };

  // Fetch comparison count
  const fetchComparisonCount = async () => {
    try {
      const customerToken = localStorage.getItem('customerToken');
      if (!customerToken) {
        setComparisonCount(0);
        return;
      }

      const response = await fetch('/api/comparison', {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setComparisonCount(data.products?.length || 0);
      }
    } catch (error) {
      // Silently fail if not authenticated
      setComparisonCount(0);
    }
  };

  // Fetch wishlist and cart count when customer logs in or when component mounts
  useEffect(() => {
    if (customer) {
      fetchWishlistCount();
      fetchCartCount();
    } else {
      setWishlistCount(0);
      setCartCount(0);
    }
  }, [customer]);

  // Also refresh cart count when pathname changes (e.g., when navigating to/from cart page)
  useEffect(() => {
    if (customer && pathname) {
      fetchCartCount();
    }
  }, [pathname, customer]);

  // Listen for wishlist updates
  useEffect(() => {
    const handleWishlistUpdate = () => {
      if (customer) {
        fetchWishlistCount();
      }
    };

    window.addEventListener('wishlistUpdated', handleWishlistUpdate);

    return () => {
      window.removeEventListener('wishlistUpdated', handleWishlistUpdate);
    };
  }, [customer]);

  // Listen for cart updates
  useEffect(() => {
    const handleCartUpdate = () => {
      if (customer) {
        fetchCartCount();
      } else {
        setCartCount(0);
      }
    };

    window.addEventListener('cartUpdated', handleCartUpdate);
    // Also listen for page visibility changes to refresh cart count
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && customer) {
        fetchCartCount();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('cartUpdated', handleCartUpdate);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [customer]);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/customer/logout', {
        method: 'POST',
      });
      localStorage.removeItem('customerToken');
      localStorage.removeItem('currentCustomer');
      setCustomer(null);
      setWishlistCount(0);
      toast({
        title: 'Success',
        description: 'Logged out successfully',
        variant: 'success',
      });
      window.location.reload();
    } catch (error) {
      console.error('Logout error:', error);
      // Still clear local storage even if API call fails
      localStorage.removeItem('customerToken');
      localStorage.removeItem('currentCustomer');
      setCustomer(null);
      // window.location.reload();
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Fetch categories with 3-level hierarchy on mount - Optimized with caching
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setCategoriesLoading(true);
        // Fetch with shorter cache time to show position updates faster
        const response = await fetch('/api/categories/with-hierarchy?status=active', {
          next: { revalidate: 60 }, // Revalidate every 1 minute
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();

        if (data.categories && Array.isArray(data.categories) && data.categories.length > 0) {
          const validCategories = data.categories.filter((cat: Category) => cat && cat.name);

          if (validCategories.length > 0) {
            const categoryNames = ['All Categories', ...validCategories.map((cat: Category) => cat.name)];
            setCategories(categoryNames);
            setCategoryList(validCategories);
          } else {
            setCategories(['All Categories']);
            setCategoryList([]);
          }
        } else {
          setCategories(['All Categories']);
          setCategoryList([]);
        }
      } catch (error) {
        console.error('Failed to fetch categories:', error);
        setCategories(['All Categories']);
        setCategoryList([]);
      } finally {
        setCategoriesLoading(false);
      }
    };
    fetchCategories();
  }, []);

  // Search products with debounce
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (searchValue.trim().length >= 2) {
      searchTimeoutRef.current = setTimeout(async () => {
        setSearchLoading(true);
        try {
          const searchQuery = searchValue.trim();
          let url = `/api/products?search=${encodeURIComponent(searchQuery)}&limit=6`;

          // Add category filter if not "All Categories"
          if (category !== 'All Categories') {
            const selectedCategory = categoryList.find(cat => cat.name === category);
            if (selectedCategory?._id) {
              url += `&category=${selectedCategory._id}`;
            }
          }

          const response = await fetch(url);
          const data = await response.json();
          setSearchResults(Array.isArray(data) ? data : []);
          setShowSearchResults(true);
        } catch (error) {
          console.error('Search error:', error);
          setSearchResults([]);
        } finally {
          setSearchLoading(false);
        }
      }, 300); // 300ms debounce
    } else {
      setSearchResults([]);
      setShowSearchResults(false);
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchValue, category, categoryList]);

  useEffect(() => {
    let ticking = false;
    let lastScrollY = window.scrollY;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const currentScrollY = window.scrollY;
          // Only update if scroll position changed significantly to prevent flickering
          if (
            Math.abs(currentScrollY - lastScrollY) > 5 ||
            (currentScrollY <= 10 && lastScrollY > 10) ||
            (currentScrollY > 10 && lastScrollY <= 10)
          ) {
            setIsScrolled(currentScrollY > 10);
            lastScrollY = currentScrollY;
          }
          ticking = false;
        });
        ticking = true;
      }
    };

    // Throttled scroll handler
    window.addEventListener('scroll', handleScroll, { passive: true });

    // Calculate header height
    const updateHeaderHeight = () => {
      if (headerRef.current) {
        const height = headerRef.current.offsetHeight;
        setHeaderHeight(height);
      }
    };
    updateHeaderHeight();
    window.addEventListener('resize', updateHeaderHeight, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', updateHeaderHeight);
    };
  }, []);

  const toggleMobileDropdown = (index: number) => setMobileDropdownOpen(mobileDropdownOpen === index ? null : index);

  // Calculate dropdown position and update nav bottom when dropdown opens
  useEffect(() => {
    if (openIndex !== null && !isScrolled) {
      // Use requestAnimationFrame to ensure DOM is updated
      requestAnimationFrame(() => {
        if (navRef.current) {
          const rect = navRef.current.getBoundingClientRect();
          setNavBottom(rect.bottom);
        }
      });
    }
  }, [openIndex, isScrolled]);

  const handleSearch = () => {
    if (!searchValue.trim()) return;

    let url = `/products?search=${encodeURIComponent(searchValue.trim())}`;
    if (category !== 'All Categories') {
      const selectedCategory = categoryList.find(cat => cat.name === category);
      if (selectedCategory) {
        url += `&category=${encodeURIComponent(selectedCategory.name)}`;
      }
    }

    router.push(url);
    setShowSearchResults(false);
    setSearchValue('');
  };

  const handleProductClick = (product: any) => {
    const productUrl = product.urlSlug ? `/products/${product.urlSlug}` : `/products/${product._id || product.id}`;
    router.push(productUrl);
    setShowSearchResults(false);
    setSearchValue('');
  };

  // Remove "All Categories"
  const finalCategories = categories.filter(c => c !== 'All Categories');

  // Add ON SALE in the end
  const menuItems = [...finalCategories];

  const handleSwitchToRegister = () => {
    setOpenLogin(false);
    setOpenRegister(true);
  };

  const handleSwitchToLogin = () => {
    setOpenRegister(false);
    setOpenLogin(true);
  };

  return (
    <>
      {/* Top Bar */}
      {/* <div className='bg-web text-white text-center py-2 text-xs sm:text-sm md:text-base border-b border-gray-700 px-4'>
        Free Express Shipping on orders $120!
      </div> */}

      {/* Header */}
      <header
        ref={headerRef}
        className='bg-web text-white sticky top-0 z-40 shadow-md transition-all duration-300 overflow-visible'
        style={{ willChange: 'transform', backfaceVisibility: 'hidden' }}>
        <div className='site-container'>
          {/* HEADER ROW */}
          <div
            className={`flex flex-wrap items-center justify-between gap-3 sm:gap-4 transition-all duration-300
              ${isScrolled ? 'py-2 md:py-3' : 'py-4 md:py-5'}
            `}>
            {/* Logo */}
            <Link href='/' className='flex items-center gap-3 flex-shrink-0' suppressHydrationWarning>
              <div className='flex items-center gap-3'>
                {logo ? (
                  <img src={logo} alt={siteName} className='h-10 md:h-14 object-contain transition-all duration-300' />
                ) : (
                  <>
                    <div className='w-10 h-10 md:w-12 md:h-12 rounded-full bg-green-500 flex items-center justify-center'>
                      <span className='text-white font-bold'>E</span>
                    </div>
                    <span className='text-xl md:text-2xl font-bold'>ECOMASTICS</span>
                  </>
                )}
              </div>
            </Link>

            {/* Desktop Search */}
            <div className='hidden md:flex flex-1 max-w-2xl'>
              <SearchBar
                categories={categories}
                value={searchValue}
                selectedCategory={category}
                placeholder='Search products, brands and more...'
                onChange={setSearchValue}
                onCategoryChange={setCategory}
                onSearch={handleSearch}
                searchResults={searchResults}
                showSearchResults={showSearchResults}
                searchLoading={searchLoading}
                onProductClick={handleProductClick}
                onFocus={() => {
                  if (searchResults.length > 0 || searchValue.trim().length >= 2) {
                    setShowSearchResults(true);
                  }
                }}
                onBlur={() => {
                  // Delay to allow click events to fire
                  setTimeout(() => setShowSearchResults(false), 200);
                }}
              />
            </div>

            {/* Icons */}
            <div className='flex items-center gap-2 sm:gap-3'>
              {mounted && (
                <Link
                  href='/become-member'
                  className='hidden sm:flex items-center gap-2 px-4 py-2 rounded-full bg-white text-web hover:bg-white/90 transition font-medium text-sm'>
                  Become a member
                </Link>
              )}
              {mounted && customer ? (
                <DropdownMenu>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <DropdownMenuTrigger asChild>
                        <button className='flex items-center gap-2 px-2 py-2 sm:px-3 sm:py-2 rounded-full bg-white/5 hover:bg-white/10 transition backdrop-blur-sm'>
                          {customer.avatar ? (
                            <img
                              src={customer.avatar}
                              alt={customer.name || 'User'}
                              className='w-7 h-7 sm:w-8 sm:h-8 rounded-full object-cover border border-white/30'
                            />
                          ) : (
                            <div className='w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white/20 flex items-center justify-center text-white text-xs font-semibold'>
                              {getInitials(customer.name)}
                            </div>
                          )}
                        </button>
                      </DropdownMenuTrigger>
                    </TooltipTrigger>
                    <TooltipContent side='bottom' className='bg-white text-web'>
                      {customer.name}
                    </TooltipContent>
                  </Tooltip>

                  <DropdownMenuContent
                    align='end'
                    className='
      w-52              /* mobile */
      sm:w-56           /* tablet */
      lg:w-64           /* desktop */
      rounded-2xl shadow-xl border border-gray-100 
      bg-white/95 backdrop-blur-md overflow-hidden
    '>
                    {/* Header */}
                    <div className='p-3 sm:p-4 bg-gray-50 border-b'>
                      <p className='text-sm font-semibold text-gray-900'>{customer.name}</p>
                      <p className='text-xs text-gray-500'>{customer.email}</p>
                    </div>

                    {/* Menu Section */}
                    <div className='py-1'>
                      <DropdownMenuItem asChild className='cursor-pointer px-3 sm:px-4 py-2.5 hover:bg-gray-50'>
                        <Link href='/account' className='flex items-center gap-3 text-sm text-gray-700'>
                          <span className='w-4 h-4 opacity-60'>
                            <User />
                          </span>
                          My Account
                        </Link>
                      </DropdownMenuItem>

                      <DropdownMenuItem asChild className='cursor-pointer px-3 sm:px-4 py-2.5 hover:bg-gray-50'>
                        <Link href='/orders' className='flex items-center gap-3 text-sm text-gray-700'>
                          <span className='w-4 h-4 opacity-60'>
                            <Package />
                          </span>
                          My Orders
                        </Link>
                      </DropdownMenuItem>
                    </div>

                    {/* Divider */}
                    <div className='border-t'></div>

                    {/* Logout */}
                    <DropdownMenuItem
                      onClick={handleLogout}
                      className='px-3 sm:px-4 py-2.5 text-red-600 text-sm cursor-pointer hover:bg-red-50 flex items-center gap-3'>
                      <LogOut className='w-4 h-4' />
                      Logout
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <>
                  <button
                    onClick={() => setOpenLogin(true)}
                    className={`p-2 rounded-full transition 
                      ${pathname === '/login' ? 'bg-white text-web' : 'hover:bg-white/10'}
                    `}>
                    <User className='w-6 h-6' />
                  </button>
                </>
              )}

              <Link
                href='/wishlist'
                className={`p-2 rounded-full relative transition 
                  ${pathname === '/wishlist' ? 'bg-white text-web' : 'hover:bg-white/10'}
                `}>
                <Heart className='w-6 h-6' />
                {wishlistCount > 0 && (
                  <span className='absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center'>
                    {wishlistCount > 9 ? '9+' : wishlistCount}
                  </span>
                )}
              </Link>

              <Link
                href='/cart'
                className={`p-2 rounded-full relative transition 
                  ${pathname === '/cart' ? 'bg-white text-web' : 'hover:bg-white/10'}
                `}>
                <ShoppingBag className='w-6 h-6' />
                {cartCount > 0 && (
                  <span className='absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center'>
                    {cartCount > 9 ? '9+' : cartCount}
                  </span>
                )}
              </Link>

              <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className='md:hidden p-2'>
                {mobileMenuOpen ? <X className='w-6 h-6' /> : <Menu className='w-6 h-6' />}
              </button>
            </div>
          </div>

          {/* Mobile Search */}
          {mobileMenuOpen && (
            <div className='md:hidden mb-3'>
              <SearchBar
                categories={categories}
                value={searchValue}
                selectedCategory={category}
                onChange={setSearchValue}
                onCategoryChange={setCategory}
                onSearch={handleSearch}
                placeholder='Search products...'
                searchResults={searchResults}
                showSearchResults={showSearchResults}
                searchLoading={searchLoading}
                onProductClick={handleProductClick}
                onFocus={() => {
                  if (searchResults.length > 0 || searchValue.trim().length >= 2) {
                    setShowSearchResults(true);
                  }
                }}
                onBlur={() => {
                  setTimeout(() => setShowSearchResults(false), 200);
                }}
              />
            </div>
          )}
          {/* Desktop Navigation */}
          <nav
            ref={navRef}
            className={`hidden md:block bg-web overflow-visible
    ${
      isScrolled
        ? 'max-h-0 py-0 opacity-0 transition-all duration-200 ease-in pointer-events-none'
        : 'max-h-20 py-3 opacity-100 transition-all duration-300 ease-out delay-100 pointer-events-auto'
    }
  `}
            style={{ willChange: 'transform', backfaceVisibility: 'hidden' }}>
            <div className='site-container'>
              {categoriesLoading ? (
                <ul className='flex flex-wrap gap-4 xl:gap-6 justify-center'>
                  {[...Array(6)].map((_, index) => (
                    <li key={index} className='h-6 w-24 bg-white/20 rounded animate-pulse' />
                  ))}
                </ul>
              ) : (
                <ul className='flex flex-wrap gap-4 xl:gap-6 justify-center'>
                  {menuItems.map((item, index) => {
                    const category = categoryList.find(cat => cat.name === item);
                    const hasChildren = category && category.children && category.children.length > 0;

                    // Categories that should not show dropdowns - direct links only
                    // Handle both "K Store" and "K-Store" variations
                    const normalizedItem = item.toLowerCase().replace(/[-\s]/g, '');
                    const isSkinBeauty = normalizedItem === 'skin&beauty' || item === 'Skin & Beauty';
                    const isKStore = normalizedItem === 'kstore' || item === 'K Store' || item === 'K-Store';
                    const isDirectLink = isSkinBeauty || isKStore;

                    return (
                      <li
                        key={index}
                        className='relative'
                        style={{ position: 'relative' }}
                        onMouseEnter={() => {
                          if (!isDirectLink) {
                            if (closeDropdownTimeoutRef.current) {
                              clearTimeout(closeDropdownTimeoutRef.current);
                              closeDropdownTimeoutRef.current = null;
                            }
                            setOpenIndex(index);
                          }
                        }}
                        onMouseLeave={() => {
                          if (!isDirectLink) {
                            closeDropdownTimeoutRef.current = setTimeout(() => {
                              setOpenIndex(null);
                            }, 100);
                          }
                        }}>
                        {/* Flipkart Logic: If category has subcategories, don't make it clickable */}
                        {category && category.subcategories && category.subcategories.length > 0 ? (
                          <span
                            className={`font-[16px] pb-1 whitespace-nowrap relative block
              after:content-[''] after:absolute after:left-0 after:bottom-0 
              after:h-[2px] after:w-0 after:bg-white after:transition-all after:duration-300
              hover:after:w-full cursor-default
            `}>
                            {item}
                          </span>
                        ) : (
                          <Link
                            href={
                              isDirectLink
                                ? isSkinBeauty
                                  ? '/skin-beauty'
                                  : '/k-store'
                                : {
                                    pathname: '/products',
                                    query: { category: item.toLowerCase().replace(/\s+/g, '-') },
                                  }
                            }
                            className={`font-[16px] pb-1 whitespace-nowrap relative block
                after:content-[''] after:absolute after:left-0 after:bottom-0 
                after:h-[2px] after:w-0 after:bg-white after:transition-all after:duration-300
                hover:after:w-full cursor-pointer
              `}>
                            {item}
                          </Link>
                        )}

                        {/* 3-Level Dropdown Menu - E-commerce Style */}
                        {!isDirectLink &&
                          openIndex === index &&
                          !isScrolled &&
                          category &&
                          category.subcategories &&
                          category.subcategories.length > 0 && (
                            <div
                              ref={el => {
                                dropdownRefs.current[index] = el;
                              }}
                              className='absolute left-1/2 -translate-x-1/2 top-full mt-2 z-[9999]'
                              style={{
                                width: 'max-content',
                                minWidth: '300px',
                                maxWidth: '90vw',
                                paddingTop: '10px',
                              }}
                              onMouseEnter={() => {
                                if (closeDropdownTimeoutRef.current) {
                                  clearTimeout(closeDropdownTimeoutRef.current);
                                  closeDropdownTimeoutRef.current = null;
                                }
                                setOpenIndex(index);
                              }}
                              onMouseLeave={() => {
                                closeDropdownTimeoutRef.current = setTimeout(() => {
                                  setOpenIndex(null);
                                }, 100);
                              }}>
                              <div className='bg-white text-gray-800 rounded-lg shadow-2xl border border-gray-200 py-5 px-6 sm:px-8'>
                                <div
                                  className={`grid gap-6 ${
                                    category.subcategories.length === 1
                                      ? 'grid-cols-1'
                                      : category.subcategories.length === 2
                                      ? 'grid-cols-2'
                                      : 'grid-cols-3'
                                  }`}>
                                  {category.subcategories.map((subcategory, subIndex) => (
                                    <div key={subIndex} className='space-y-4'>
                                      {/* Subcategory Header - Flipkart Logic: If has child categories, not clickable */}
                                      {subcategory.childCategories && subcategory.childCategories.length > 0 ? (
                                        <span className='block text-[#e91e63] font-bold text-lg mb-4 uppercase tracking-wide cursor-default'>
                                          {subcategory.name}
                                        </span>
                                      ) : (
                                        <Link
                                          href={{
                                            pathname: '/products',
                                            query: {
                                              category: category.slug,
                                              subcategory: subcategory.slug,
                                            },
                                          }}
                                          className='block text-[#e91e63] font-bold text-lg mb-4 hover:text-[#c2185b] transition-colors cursor-pointer uppercase tracking-wide'>
                                          {subcategory.name}
                                        </Link>
                                      )}

                                      {/* Child Categories (Black text) - Clean E-commerce Style */}
                                      {subcategory.childCategories && subcategory.childCategories.length > 0 && (
                                        <ul className='space-y-2.5'>
                                          {subcategory.childCategories.map((childCategory, childIndex) => (
                                            <li key={childIndex}>
                                              <Link
                                                href={{
                                                  pathname: '/products',
                                                  query: {
                                                    category: category.slug,
                                                    subcategory: subcategory.slug,
                                                    childCategory: childCategory.slug,
                                                  },
                                                }}
                                                className='block text-gray-900 text-[15px] py-1.5 hover:text-[#e91e63] transition-colors cursor-pointer font-normal leading-relaxed'>
                                                {childCategory.name}
                                              </Link>
                                            </li>
                                          ))}
                                        </ul>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          )}

                        {/* Fallback: 2-level dropdown for categories without subcategories but with children */}
                        {!isDirectLink &&
                          openIndex === index &&
                          !isScrolled &&
                          category &&
                          category.children &&
                          category.children.length > 0 &&
                          !category.subcategories && (
                            <div
                              className='absolute left-1/2 -translate-x-1/2 top-full mt-2 z-[9999]'
                              style={{
                                width: 'max-content',
                                minWidth: '200px',
                                maxWidth: '90vw',
                                paddingTop: '10px',
                              }}
                              onMouseEnter={() => {
                                if (closeDropdownTimeoutRef.current) {
                                  clearTimeout(closeDropdownTimeoutRef.current);
                                  closeDropdownTimeoutRef.current = null;
                                }
                                setOpenIndex(index);
                              }}
                              onMouseLeave={() => {
                                closeDropdownTimeoutRef.current = setTimeout(() => {
                                  setOpenIndex(null);
                                }, 100);
                              }}>
                              <div className='bg-white text-gray-800 rounded-lg shadow-lg border border-gray-200 py-2'>
                                {category.children.map((child, childIndex) => (
                                  <Link
                                    key={childIndex}
                                    href={{
                                      pathname: '/products',
                                      query: {
                                        category: category.name.toLowerCase().replace(/\s+/g, '-'),
                                        subCategory: child.slug || child.name.toLowerCase().replace(/\s+/g, '-'),
                                      },
                                    }}
                                    className='block px-4 py-2 hover:bg-gray-100 transition-colors text-sm'>
                                    {child.name}
                                  </Link>
                                ))}
                              </div>
                            </div>
                          )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </nav>
          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className='md:hidden bg-web text-white border-t border-white/20 mt-1 pb-3'>
              {menuItems.map((item, index) => {
                const category = categoryList.find(cat => cat.name === item);
                const hasSubcategories = category && category.subcategories && category.subcategories.length > 0;
                const hasChildren = category && category.children && category.children.length > 0;
                const isOpen = mobileDropdownOpen === index;

                // Categories that should not show dropdowns - direct links only
                // Handle both "K Store" and "K-Store" variations
                const normalizedItem = item.toLowerCase().replace(/[-\s]/g, '');
                const isSkinBeauty = normalizedItem === 'skin&beauty' || item === 'Skin & Beauty';
                const isKStore = normalizedItem === 'kstore' || item === 'K Store' || item === 'K-Store';
                const isDirectLink = isSkinBeauty || isKStore;

                return (
                  <div key={index} className='px-4'>
                    <div className='flex items-center justify-between'>
                      {/* Flipkart Logic: If category has subcategories, don't make it clickable */}
                      {hasSubcategories ? (
                        <span className={`py-2 w-full block ${item === 'ON SALE' ? 'font-semibold' : ''} cursor-default`}>{item}</span>
                      ) : (
                        <Link
                          href={
                            item === 'ON SALE'
                              ? '/products'
                              : isDirectLink
                              ? isSkinBeauty
                                ? '/skin-beauty'
                                : '/k-store'
                              : `/products?category=${category?.slug || item.toLowerCase().replace(/\s+/g, '-')}`
                          }
                          className={`py-2 w-full block ${item === 'ON SALE' ? 'font-semibold' : ''}`}>
                          {item}
                        </Link>
                      )}
                      {!isDirectLink && hasSubcategories && (
                        <button onClick={() => setMobileDropdownOpen(isOpen ? null : index)} className='p-2'>
                          <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                        </button>
                      )}
                    </div>

                    {/* 3-Level Menu for Mobile */}
                    {!isDirectLink && hasSubcategories && isOpen && category && (
                      <div className='pl-4 pb-2 space-y-4'>
                        {category.subcategories?.map((subcategory, subIndex) => (
                          <div key={subIndex}>
                            {/* Flipkart Logic: If subcategory has child categories, don't make it clickable */}
                            {subcategory.childCategories && subcategory.childCategories.length > 0 ? (
                              <span className='block py-2 text-sm font-semibold text-white/90 cursor-default'>{subcategory.name}</span>
                            ) : (
                              <Link
                                href={`/products?category=${category.slug}&subcategory=${subcategory.slug}`}
                                className='block py-2 text-sm font-semibold text-white/90 hover:text-white'>
                                {subcategory.name}
                              </Link>
                            )}
                            {subcategory.childCategories && subcategory.childCategories.length > 0 && (
                              <div className='pl-3 space-y-1'>
                                {subcategory.childCategories.map((childCategory, childIndex) => (
                                  <Link
                                    key={childIndex}
                                    href={`/products?category=${category.slug}&subcategory=${subcategory.slug}&childCategory=${childCategory.slug}`}
                                    className='block py-1 text-xs text-white/70 hover:text-white'>
                                    {childCategory.name}
                                  </Link>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Fallback: Child categories for mobile (2-level) */}
                    {!isDirectLink && hasChildren && !hasSubcategories && (
                      <div className='pl-4 pb-2'>
                        {category.children!.map((child, childIndex) => (
                          <Link
                            key={childIndex}
                            href={`/category/${child.slug || child.name.toLowerCase().replace(/\s+/g, '-')}`}
                            className='block py-1 text-sm text-white/80 hover:text-white'>
                            {child.name}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </header>

      {/* Auth Modals */}
      <AuthModals
        openLogin={openLogin}
        openRegister={openRegister}
        onCloseLogin={() => setOpenLogin(false)}
        onCloseRegister={() => setOpenRegister(false)}
        onSwitchToRegister={handleSwitchToRegister}
        onSwitchToLogin={handleSwitchToLogin}
      />
    </>
  );
}
