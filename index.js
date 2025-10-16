class ProductDemo {
  constructor() {
    this.currentMode = 'pagination';
    this.totalProducts = 300;
    this.productsPerPage = 20;
    this.totalPages = Math.ceil(this.totalProducts / this.productsPerPage);
    this.categories = ['Tapping Tool', 'Drills', 'End Mills', 'Reamers', 'Countersinks', 'Boring Tools'];
    this.productsPerCategory = 50;

    this.paginationState = {
      page: 1,
      totalPages: this.totalPages,
      pageData: {},
      scrollPosition: 0,
      categoryTracker: new Map()
    };

    this.infiniteState = {
      page: 1,
      totalPages: this.totalPages,
      categories: new Map(),
      isLoading: false,
      allProducts: [],
      scrollPosition: 0
    };

    this.init();
  }

  init() {
    this.bindEvents();
    this.loadPaginationData(1);
    this.restoreState();
  }

  bindEvents() {
    document.getElementById('paginationTab').addEventListener('click', () => this.switchMode('pagination'));
    document.getElementById('infiniteTab').addEventListener('click', () => this.switchMode('infinite'));

    document.getElementById('prevBtnMobile').addEventListener('click', () => this.previousPage());
    document.getElementById('nextBtnMobile').addEventListener('click', () => this.nextPage());
    document.getElementById('prevBtnDesktop').addEventListener('click', () => this.previousPage());
    document.getElementById('nextBtnDesktop').addEventListener('click', () => this.nextPage());

    document.getElementById('closeModal').addEventListener('click', () => this.closeModal());
    document.getElementById('backToList').addEventListener('click', () => this.closeModal());

    this.setupInfiniteScroll();
  }

  switchMode(mode) {
    this.saveState();
    this.currentMode = mode;

    const paginationTab = document.getElementById('paginationTab');
    const infiniteTab = document.getElementById('infiniteTab');
    const paginationDemo = document.getElementById('paginationDemo');
    const infiniteDemo = document.getElementById('infiniteDemo');

    if (mode === 'pagination') {
      paginationTab.className = 'px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg';
      infiniteTab.className = 'px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg';
      paginationDemo.classList.remove('hidden');
      infiniteDemo.classList.add('hidden');
    } else {
      infiniteTab.className = 'px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg';
      paginationTab.className = 'px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg';
      infiniteDemo.classList.remove('hidden');
      paginationDemo.classList.add('hidden');
      if (this.infiniteState.allProducts.length === 0) {
        this.loadInfiniteData();
      }
    }

    this.restoreState();
  }

  async loadPaginationData(page) {
    if (this.paginationState.pageData[page]) {
      this.renderPaginationList(this.paginationState.pageData[page]);
      this.updatePaginationUI();
      return;
    }

    this.showPaginationLoader();

    try {
      await this.delay(800);
      const mockResponse = this.generateMockAPIResponse(page, this.productsPerPage);
      this.paginationState.pageData[page] = mockResponse;
      this.paginationState.page = page;

      this.renderPaginationList(mockResponse);
      this.updatePaginationUI();
    } catch (error) {
      console.error('Error loading pagination data:', error);
    } finally {
      this.hidePaginationLoader();
    }
  }

  async loadInfiniteData() {
    if (this.infiniteState.isLoading || this.infiniteState.page > this.infiniteState.totalPages) return;

    this.infiniteState.isLoading = true;
    this.showInfiniteLoader();

    try {
      await this.delay(1000);
      const mockResponse = this.generateMockAPIResponse(this.infiniteState.page, this.productsPerPage);

      mockResponse.rows.forEach(product => {
        if (this.infiniteState.categories.has(product.category)) {
          const existing = this.infiniteState.categories.get(product.category);
          existing.products.push(product);
        } else {
          this.infiniteState.categories.set(product.category, {
            name: product.category,
            products: [product]
          });
        }
      });

      this.infiniteState.allProducts = [...this.infiniteState.allProducts, ...mockResponse.rows];
      this.infiniteState.page++;

      this.renderInfiniteList();
      this.updateInfiniteUI();
    } catch (error) {
      console.error('Error loading infinite data:', error);
    } finally {
      this.infiniteState.isLoading = false;
      this.hideInfiniteLoader();
    }
  }

  generateMockAPIResponse(page, perPage) {
    const brands = ['FCT', 'YG', 'NS TOOL', 'Walter', 'Mitsubishi', 'OSG', 'Guhring', 'Emuge'];
    const materials = ['HSS', 'Carbide', 'Cobalt', 'TiN Coated', 'TiAlN Coated'];

    const startProduct = (page - 1) * perPage;
    const endProduct = Math.min(startProduct + perPage, this.totalProducts);
    const rows = [];

    for (let i = startProduct; i < endProduct; i++) {
      const categoryIndex = Math.floor(i / this.productsPerCategory);
      const categoryName = this.categories[categoryIndex];
      const productInCategory = (i % this.productsPerCategory) + 1;
      const material = materials[i % materials.length];
      const brand = brands[i % brands.length];

      rows.push({
        ulid: `01J4GZNRH1JWH69CAW2Y${String(i + 1).padStart(6, '0')}`,
        name: `${material} ${categoryName.slice(0, -1)} #${productInCategory}`,
        brand: brand,
        category: categoryName,
        description: `High-precision ${material.toLowerCase()} cutting tool for metal machining applications in industrial manufacturing environments.`,
        mainImageUrl: `precision ${categoryName.toLowerCase()} cutting tool product photography, white background, studio lighting`
      });
    }

    return {
      currentPage: page,
      lastPage: this.totalPages,
      perPage: perPage,
      total: this.totalProducts,
      rows: rows
    };
  }

  renderPaginationList(apiResponse) {
    const list = document.getElementById('paginationList');
    const currentPage = this.paginationState.page;

    const categoriesMap = new Map();
    apiResponse.rows.forEach(product => {
      if (!categoriesMap.has(product.category)) {
        categoriesMap.set(product.category, { name: product.category, products: [] });
      }
      categoriesMap.get(product.category).products.push(product);
    });

    const categories = Array.from(categoriesMap.values());

    list.innerHTML = categories.map(category => {
      const shouldShowTitle = this.shouldShowCategoryTitle(category.name, currentPage);
      return this.createCategorySection(category, shouldShowTitle);
    }).join('');
  }

  shouldShowCategoryTitle(categoryName, page) {
    const categoryIndex = this.categories.indexOf(categoryName);
    const categoryStartProduct = categoryIndex * this.productsPerCategory;
    const pageStartProduct = (page - 1) * this.productsPerPage;

    return categoryStartProduct >= pageStartProduct && categoryStartProduct < pageStartProduct + this.productsPerPage;
  }

  renderInfiniteList() {
    const list = document.getElementById('infiniteList');
    const categoriesArray = Array.from(this.infiniteState.categories.values());
    list.innerHTML = categoriesArray.map(category => this.createCategorySection(category, true)).join('');
  }

  createCategorySection(category, showTitle = true) {
    return `
            <div class="category-section">
                ${showTitle ? `<h2 class="text-xl font-semibold text-gray-900 mb-6 border-b border-gray-200 pb-3">
                    ${category.name}
                </h2>` : ''}
                <div class="space-y-4">
                    ${category.products.map(product => this.createProductItem(product)).join('')}
                </div>
            </div>
        `;
  }

  createProductItem(product) {
    return `
            <div class="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-shadow cursor-pointer product-item" data-product='${JSON.stringify(product)}'>
                <div class="flex items-start space-x-6">
                    <div class="flex-shrink-0">
                        <img class="w-40 h-20 object-cover rounded-lg" src="./assets/photos/taping_tool.png" alt="${product.mainImageUrl}" />
                    </div>
                    <div class="flex-1 min-w-0">
                        <h3 class="text-lg font-medium text-gray-900 mb-2">${product.name}</h3>
                        <p class="text-sm text-gray-600 mb-2 font-medium">${product.brand}</p>
                        <p class="text-sm text-gray-500 leading-relaxed">${product.description}</p>
                    </div>
                    <div class="flex-shrink-0">
                        <i class="fa-solid fa-chevron-right text-gray-400 text-lg"></i>
                    </div>
                </div>
            </div>
        `;
  }

  setupInfiniteScroll() {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && this.currentMode === 'infinite') {
          this.loadInfiniteData();
        }
      });
    }, { threshold: 0.1 });

    const sentinel = document.createElement('div');
    sentinel.id = 'scrollSentinel';
    sentinel.className = 'h-10';
    document.getElementById('infiniteDemo').appendChild(sentinel);
    observer.observe(sentinel);
  }

  showPaginationLoader() {
    document.getElementById('paginationLoader').classList.remove('hidden');
    document.getElementById('paginationList').classList.add('hidden');
  }

  hidePaginationLoader() {
    document.getElementById('paginationLoader').classList.add('hidden');
    document.getElementById('paginationList').classList.remove('hidden');
  }

  showInfiniteLoader() {
    document.getElementById('infiniteLoader').classList.remove('hidden');
  }

  hideInfiniteLoader() {
    document.getElementById('infiniteLoader').classList.add('hidden');
    if (this.infiniteState.page > this.infiniteState.totalPages) {
      document.getElementById('endMessage').classList.remove('hidden');
    }
  }

  updatePaginationUI() {
    const currentPage = this.paginationState.page;
    const totalPages = this.paginationState.totalPages;
    const startProduct = (currentPage - 1) * this.productsPerPage + 1;
    const endProduct = Math.min(currentPage * this.productsPerPage, this.totalProducts);

    document.getElementById('showingFrom').textContent = startProduct;
    document.getElementById('showingTo').textContent = endProduct;
    document.getElementById('totalProducts').textContent = this.totalProducts;

    const prevButtons = [document.getElementById('prevBtnMobile'), document.getElementById('prevBtnDesktop')];
    const nextButtons = [document.getElementById('nextBtnMobile'), document.getElementById('nextBtnDesktop')];

    prevButtons.forEach(btn => btn.disabled = currentPage === 1);
    nextButtons.forEach(btn => btn.disabled = currentPage === totalPages);

    this.renderPageNumbers();
  }

  renderPageNumbers() {
    const currentPage = this.paginationState.page;
    const totalPages = this.paginationState.totalPages;
    const pageNumbers = document.getElementById('pageNumbers');

    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, currentPage + 2);

    if (endPage - startPage < 4) {
      if (startPage === 1) {
        endPage = Math.min(totalPages, startPage + 4);
      } else {
        startPage = Math.max(1, endPage - 4);
      }
    }

    let html = '';

    for (let i = startPage; i <= endPage; i++) {
      if (i === currentPage) {
        html += `<button class="relative z-10 inline-flex items-center bg-blue-600 px-4 py-2 text-sm font-semibold text-white focus:z-20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600">${i}</button>`;
      } else {
        html += `<button class="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 page-number" data-page="${i}">${i}</button>`;
      }
    }

    pageNumbers.innerHTML = html;

    pageNumbers.querySelectorAll('.page-number').forEach(btn => {
      btn.addEventListener('click', () => {
        const page = parseInt(btn.dataset.page);
        this.loadPaginationData(page);
      });
    });
  }

  updateInfiniteUI() {
    document.getElementById('loadedCount').textContent = `${this.infiniteState.allProducts.length} of 300 products loaded`;
  }

  previousPage() {
    if (this.paginationState.page > 1) {
      this.saveScrollPosition();
      this.loadPaginationData(this.paginationState.page - 1);
    }
  }

  nextPage() {
    if (this.paginationState.page < this.paginationState.totalPages) {
      this.saveScrollPosition();
      this.loadPaginationData(this.paginationState.page + 1);
    }
  }

  saveScrollPosition() {
    if (this.currentMode === 'pagination') {
      this.paginationState.scrollPosition = window.scrollY;
    } else {
      this.infiniteState.scrollPosition = window.scrollY;
    }
  }

  restoreScrollPosition() {
    setTimeout(() => {
      const position = this.currentMode === 'pagination'
        ? this.paginationState.scrollPosition
        : this.infiniteState.scrollPosition;
      window.scrollTo(0, position);
    }, 100);
  }

  openProductModal(product) {
    this.saveState();
    const modal = document.getElementById('modalContent');
    modal.querySelector('h4').textContent = product.name;
    modal.querySelector('p:nth-of-type(1)').textContent = product.brand;
    modal.querySelector('p:nth-of-type(2)').textContent = product.description;
    document.getElementById('productModal').classList.remove('hidden');
  }

  closeModal() {
    document.getElementById('productModal').classList.add('hidden');
    this.restoreState();
  }

  saveState() {
    this.saveScrollPosition();

    if (this.currentMode === 'pagination') {
      sessionStorage.setItem('paginationState', JSON.stringify(this.paginationState));
    } else {
      const stateToSave = {
        page: this.infiniteState.page,
        totalPages: this.infiniteState.totalPages,
        allProducts: this.infiniteState.allProducts,
        categories: Array.from(this.infiniteState.categories.entries()),
        scrollPosition: this.infiniteState.scrollPosition
      };
      sessionStorage.setItem('infiniteState', JSON.stringify(stateToSave));
    }
  }

  restoreState() {
    if (this.currentMode === 'pagination') {
      const saved = sessionStorage.getItem('paginationState');
      if (saved) {
        this.paginationState = { ...this.paginationState, ...JSON.parse(saved) };
        this.restoreScrollPosition();
      }
    } else {
      const saved = sessionStorage.getItem('infiniteState');
      if (saved) {
        const state = JSON.parse(saved);
        this.infiniteState.page = state.page;
        this.infiniteState.totalPages = state.totalPages;
        this.infiniteState.allProducts = state.allProducts || [];
        this.infiniteState.categories = new Map(state.categories || []);
        this.infiniteState.scrollPosition = state.scrollPosition || 0;

        if (this.infiniteState.allProducts.length > 0) {
          this.renderInfiniteList();
          this.updateInfiniteUI();
        }

        this.restoreScrollPosition();
      }
    }
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const demo = new ProductDemo();

  document.addEventListener('click', (e) => {
    const item = e.target.closest('.product-item');
    if (item) {
      const product = JSON.parse(item.dataset.product);
      demo.openProductModal(product);
    }
  });
});