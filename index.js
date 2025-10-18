class ProductDemo {
  constructor() {
    this.currentMode = 'pagination';
    this.totalProducts = 300;
    this.productsPerPage = 20;
    this.totalPages = Math.ceil(this.totalProducts / this.productsPerPage);
    this.categories = ['Tapping Tool', 'Drills', 'End Mills', 'Reamers', 'Countersinks', 'Boring Tools'];
    // this.productsPerCategory = 50; // 不再使用固定配額

    // 類別數量改為：隨機分配（總和=300），並計算每類起始索引
    this.categoryAllocation = this.buildRandomAllocation(this.totalProducts, this.categories.length);
    this.categoryStarts = this.computeCategoryStarts(this.categoryAllocation);

    this.isLoadingPage = false;

    // 分頁狀態（不使用任何快取或 storage）
    this.paginationState = {
      page: 1,
      totalPages: this.totalPages,
      pageData: {},           // 仍保留欄位但不使用
      scrollPosition: 0,      // 不再保存/還原
      categoryTracker: new Map()
    };

    // 無限滾動狀態（不使用任何快取或 storage）
    this.infiniteState = {
      page: 1,                 // 代表下一次要載入的「第幾批/頁」
      totalPages: this.totalPages,
      categories: new Map(),   // 只做當次渲染的臨時聚合
      isLoading: false,
      allProducts: [],
      scrollPosition: 0
    };

    this.init();
  }

  init() {
    this.bindEvents();

    // 預設進入 Pagination：直接載入第 1 頁
    this.loadPaginationData(1);
    // ❌ 不再 restoreState()
  }

  bindEvents() {
    document.getElementById('paginationTab').addEventListener('click', () => this.switchMode('pagination'));
    document.getElementById('infiniteTab').addEventListener('click', () => this.switchMode('infinite'));

    document.getElementById('prevBtnMobile').addEventListener('click', () => this.previousPage());
    document.getElementById('nextBtnMobile').addEventListener('click', () => this.nextPage());
    document.getElementById('prevBtnDesktop').addEventListener('click', () => this.previousPage());
    document.getElementById('nextBtnDesktop').addEventListener('click', () => this.nextPage());

    // document.getElementById('closeModal').addEventListener('click', () => this.closeModal());
    // document.getElementById('backToList').addEventListener('click', () => this.closeModal());

    this.setupInfiniteScroll();
  }

  // === 模式切換：不保存狀態，直接重置並重新載入 ===
  switchMode(mode) {
    // ❌ 不再 saveState()
    this.currentMode = mode;

    const paginationTab = document.getElementById('paginationTab');
    const infiniteTab = document.getElementById('infiniteTab');
    const paginationDemo = document.getElementById('paginationDemo');
    const infiniteDemo = document.getElementById('infiniteDemo');

    if (mode === 'pagination') {
      // 更新 Tab 樣式
      paginationTab.className = 'px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg';
      infiniteTab.className = 'px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg';

      // 顯示/隱藏區塊
      paginationDemo.classList.remove('hidden');
      infiniteDemo.classList.add('hidden');

      // 重置 Pagination 狀態 → 第 1 頁並重新載入
      this.paginationState.page = 1;
      const list = document.getElementById('paginationList');
      if (list) list.innerHTML = '';
      this.loadPaginationData(1);
      window.scrollTo({ top: 0, behavior: 'instant' });
    } else {
      // 更新 Tab 樣式
      infiniteTab.className = 'px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg';
      paginationTab.className = 'px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg';

      // 顯示/隱藏區塊
      infiniteDemo.classList.remove('hidden');
      paginationDemo.classList.add('hidden');

      // 重置 Infinite 狀態 → 清空並回到第一批
      this.infiniteState.page = 1;
      this.infiniteState.categories = new Map();
      this.infiniteState.allProducts = [];
      const list = document.getElementById('infiniteList');
      if (list) list.innerHTML = '';
      document.getElementById('loadedCount').textContent = `0 of ${this.totalProducts} products loaded`;
      document.getElementById('endMessage').classList.add('hidden');

      // 重新載入第一批
      this.loadInfiniteData();
      window.scrollTo({ top: 0, behavior: 'instant' });
    }

    // ❌ 不再 restoreState()
  }

  async loadPaginationData(page) {
    // 邊界
    const total = this.paginationState.totalPages || this.totalPages;
    if (page < 1) page = 1;
    if (page > total) page = total;

    this.showPaginationLoader();

    try {
      // 不使用快取：每次都模擬 API 延遲再取資料
      await this.delay(800);
      const mockResponse = this.generateMockAPIResponse(page, this.productsPerPage);

      // 每次都更新目前頁碼
      this.paginationState.page = page;

      // 渲染清單與 UI
      this.renderPaginationList(mockResponse);
      this.updatePaginationUI();
    } catch (error) {
      console.error('Error loading pagination data:', error);
    } finally {
      this.hidePaginationLoader();
    }
  }

  async loadInfiniteData() {
    // 到頂就不再載
    if (this.infiniteState.isLoading || this.infiniteState.page > this.infiniteState.totalPages) return;

    this.infiniteState.isLoading = true;
    this.showInfiniteLoader();

    try {
      await this.delay(1000);
      const mockResponse = this.generateMockAPIResponse(this.infiniteState.page, this.productsPerPage);

      // 聚合本批資料到類別
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

      // 附加到全部已載產品
      this.infiniteState.allProducts = [...this.infiniteState.allProducts, ...mockResponse.rows];
      this.infiniteState.page++;

      // 渲染 & UI
      this.renderInfiniteList();
      this.updateInfiniteUI();
    } catch (error) {
      console.error('Error loading infinite data:', error);
    } finally {
      this.infiniteState.isLoading = false;
      this.hideInfiniteLoader();
    }
  }

  // === 類別分配工具 ===
  buildRandomAllocation(total, k) {
    const counts = Array(k).fill(0);
    for (let i = 0; i < total; i++) {
      const bucket = Math.floor(Math.random() * k);
      counts[bucket]++;
    }
    // 若你想「每類至少 1 筆」可改成遞迴重抽（此版保留可能為 0 的情況）
    return counts;
  }

  computeCategoryStarts(allocation) {
    const starts = [];
    let acc = 0;
    for (let i = 0; i < allocation.length; i++) {
      starts.push(acc);
      acc += allocation[i];
    }
    return starts;
  }

  categoryForGlobalIndex(i) {
    for (let catIdx = 0; catIdx < this.categories.length; catIdx++) {
      const start = this.categoryStarts[catIdx];
      const end = start + this.categoryAllocation[catIdx]; // not inclusive
      if (i >= start && i < end) {
        return { catIndex: catIdx, inCategoryIndex: i - start };
      }
    }
    return { catIndex: this.categories.length - 1, inCategoryIndex: 0 };
  }

  generateMockAPIResponse(page, perPage) {
    const brands = ['FCT', 'YG', 'NS TOOL', 'Walter', 'Mitsubishi', 'OSG', 'Guhring', 'Emuge'];
    const materials = ['HSS', 'Carbide', 'Cobalt', 'TiN Coated', 'TiAlN Coated'];

    const startProduct = (page - 1) * perPage;
    const endProduct = Math.min(startProduct + perPage, this.totalProducts);
    const rows = [];

    for (let i = startProduct; i < endProduct; i++) {
      const { catIndex, inCategoryIndex } = this.categoryForGlobalIndex(i);
      const categoryName = this.categories[catIndex];
      const productInCategory = inCategoryIndex + 1;

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
      rows
    };
  }

  // === 渲染（Pagination） ===
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

  // ✅ 改為依「隨機分配」計算標題是否顯示
  shouldShowCategoryTitle(categoryName, page) {
    const catIndex = this.categories.indexOf(categoryName);
    if (catIndex === -1) return false;

    const categoryStartProduct = this.categoryStarts[catIndex]; // 0-based
    const pageStartProduct = (page - 1) * this.productsPerPage; // 0-based
    const pageEndProduct = pageStartProduct + this.productsPerPage; // not inclusive

    return categoryStartProduct >= pageStartProduct && categoryStartProduct < pageEndProduct;
  }

  // === 渲染（Infinite） ===
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
    // 不改你的卡片 Layout/樣式（仍保留 cursor-pointer / chevron）
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

  // === Infinite Scroll 觸發 ===
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

  // === Loading 顯示/隱藏 ===
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

  // === 分頁 UI ===
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
    document.getElementById('loadedCount').textContent =
      `${this.infiniteState.allProducts.length} of ${this.totalProducts} products loaded`;
  }

  previousPage() {
    if (this.paginationState.page > 1) {
      // ❌ 不再保存 scrollPosition
      this.loadPaginationData(this.paginationState.page - 1);
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  }

  nextPage() {
    if (this.paginationState.page < this.paginationState.totalPages) {
      // ❌ 不再保存 scrollPosition
      this.loadPaginationData(this.paginationState.page + 1);
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  }

  // ❌ 不再使用保存/還原狀態與捲動位置
  // saveScrollPosition() {}
  // restoreScrollPosition() {}
  // saveState() {}
  // restoreState() {}

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const demo = new ProductDemo();

  // ❌ 不再委派卡片點擊事件開啟 Modal（Modal 已不使用）
  // document.addEventListener('click', (e) => { ... });
});