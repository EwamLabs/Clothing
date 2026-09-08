/**
 * ALURA Atelier — E-Commerce Application Logic
 * Modular vanilla JavaScript for luxury storefront interactions
 */

(function () {
  'use strict';

  // --- STATE ---
  const state = {
    products: [],
    filteredProducts: [],
    activeCategory: 'All',
    activeSort: 'featured',
    searchQuery: '',
    bag: [],
    selectedProductForModal: null,
    selectedSizeInModal: null,
    selectedColorInModal: null
  };

  // --- DOM ELEMENTS ---
  const dom = {
    productGrid: document.getElementById('productGrid'),
    categoryTabs: document.getElementById('categoryTabs'),
    sortSelect: document.getElementById('sortSelect'),
    resultsCounter: document.getElementById('resultsCounter'),
    activeFilterBadge: document.getElementById('activeFilterBadge'),
    activeFilterText: document.getElementById('activeFilterText'),
    resetFilterBtn: document.getElementById('resetFilterBtn'),

    // Search
    searchToggleBtn: document.getElementById('searchToggleBtn'),
    searchDropdown: document.getElementById('searchDropdown'),
    searchInput: document.getElementById('searchInput'),
    searchClearBtn: document.getElementById('searchClearBtn'),

    // Bag Drawer
    bagToggleBtn: document.getElementById('bagToggleBtn'),
    bagDrawer: document.getElementById('bagDrawer'),
    bagBackdrop: document.getElementById('bagBackdrop'),
    closeBagBtn: document.getElementById('closeBagBtn'),
    bagCountBadge: document.getElementById('bagCountBadge'),
    bagDrawerCount: document.getElementById('bagDrawerCount'),
    bagItemsList: document.getElementById('bagItemsList'),
    bagSubtotalAmount: document.getElementById('bagSubtotalAmount'),
    bagFooter: document.getElementById('bagFooter'),
    openCheckoutBtn: document.getElementById('openCheckoutBtn'),
    continueShoppingBtn: document.getElementById('continueShoppingBtn'),

    // Product Modal
    productModal: document.getElementById('productModal'),
    productModalBackdrop: document.getElementById('productModalBackdrop'),
    closeProductModalBtn: document.getElementById('closeProductModalBtn'),
    productModalBody: document.getElementById('productModalBody'),

    // Checkout Modal
    checkoutModal: document.getElementById('checkoutModal'),
    checkoutModalBackdrop: document.getElementById('checkoutModalBackdrop'),
    closeCheckoutModalBtn: document.getElementById('closeCheckoutModalBtn'),
    checkoutForm: document.getElementById('checkoutForm'),
    checkoutSummaryItems: document.getElementById('checkoutSummaryItems'),
    checkoutSubtotal: document.getElementById('checkoutSubtotal'),
    checkoutTax: document.getElementById('checkoutTax'),
    checkoutTotal: document.getElementById('checkoutTotal'),
    submitOrderBtn: document.getElementById('submitOrderBtn'),
    checkoutSpinner: document.getElementById('checkoutSpinner'),
    submitOrderBtnText: document.getElementById('submitOrderBtnText'),

    // Order Confirmation Modal
    orderConfirmModal: document.getElementById('orderConfirmModal'),
    orderConfirmBackdrop: document.getElementById('orderConfirmBackdrop'),
    confirmCardContent: document.getElementById('confirmCardContent'),

    // Client Services Info Modal
    infoModal: document.getElementById('infoModal'),
    infoModalBackdrop: document.getElementById('infoModalBackdrop'),
    closeInfoModalBtn: document.getElementById('closeInfoModalBtn'),
    infoModalContent: document.getElementById('infoModalContent'),

    // Mobile Navigation
    mobileMenuBtn: document.getElementById('mobileMenuBtn'),
    mobileDrawer: document.getElementById('mobileDrawer'),
    closeMobileDrawerBtn: document.getElementById('closeMobileDrawerBtn'),

    // Newsletter
    newsletterForm: document.getElementById('newsletterForm'),
    newsletterEmail: document.getElementById('newsletterEmail'),
    newsletterFeedback: document.getElementById('newsletterFeedback'),

    // Toast Container
    toastContainer: document.getElementById('toastContainer')
  };

  // --- INITIALIZATION ---
  async function init() {
    loadBagFromStorage();
    updateBagBadge();
    bindEvents();
    await fetchProducts();
  }

  // --- API CALLS ---
  async function fetchProducts() {
    try {
      const url = new URL('/api/products', window.location.origin);
      if (state.activeCategory !== 'All') {
        url.searchParams.set('category', state.activeCategory);
      }
      if (state.activeSort !== 'featured') {
        url.searchParams.set('sort', state.activeSort);
      }
      if (state.searchQuery) {
        url.searchParams.set('q', state.searchQuery);
      }

      const res = await fetch(url);
      if (!res.ok) throw new Error('Network response not ok');
      const data = await res.json();
      state.products = data.products || [];
      renderProducts();
    } catch (err) {
      console.warn('API error or local file origin:', err);
      // Fallback: try loading static json
      try {
        const fallbackRes = await fetch('data/products.json');
        if (fallbackRes.ok) {
          state.products = await fallbackRes.json();
          renderProducts();
        } else {
          showErrorState();
        }
      } catch (e) {
        showErrorState();
      }
    }
  }

  function showErrorState() {
    dom.productGrid.innerHTML = `
      <div class="empty-state">
        <p>The atelier catalog is currently being re-indexed.</p>
        <p style="margin-top: 0.5rem; font-size: 0.78rem;">Please run <code>node server.js</code> in the project directory.</p>
      </div>
    `;
  }

  // --- RENDERING PRODUCTS ---
  function renderProducts() {
    let items = [...state.products];

    // Local filter if static fallback was used
    if (state.activeCategory !== 'All') {
      items = items.filter(p => p.category.toLowerCase() === state.activeCategory.toLowerCase());
    }
    if (state.searchQuery) {
      const q = state.searchQuery.toLowerCase();
      items = items.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.subtitle.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        p.composition.toLowerCase().includes(q)
      );
    }

    // Local sort
    if (state.activeSort === 'price-asc') {
      items.sort((a, b) => a.price - b.price);
    } else if (state.activeSort === 'price-desc') {
      items.sort((a, b) => b.price - a.price);
    } else if (state.activeSort === 'newest') {
      items.reverse();
    }

    state.filteredProducts = items;

    // Update Counter
    dom.resultsCounter.textContent = `Displaying ${items.length} edition${items.length === 1 ? '' : 's'}`;

    if (items.length === 0) {
      dom.productGrid.innerHTML = `
        <div class="empty-state">
          <p>No matching editions found for your current selection.</p>
          <button class="cta-btn cta-btn-secondary" style="margin-top: 1.5rem; color: var(--text-primary); border-color: var(--border-hairline);" id="resetSearchBtn">
            CLEAR ALL FILTERS
          </button>
        </div>
      `;
      const rBtn = document.getElementById('resetSearchBtn');
      if (rBtn) {
        rBtn.addEventListener('click', () => {
          resetAllFilters();
        });
      }
      return;
    }

    const html = items.map(product => {
      const primaryImg = product.images[0];
      const secondaryImg = product.images[1] || product.images[0];
      const colorDots = product.colors.map(c => `
        <span class="color-dot" style="background-color: ${c.hex};" title="${c.name}"></span>
      `).join('');

      const sizePills = product.sizes.map(size => `
        <button class="quick-size-btn" data-product-id="${product.id}" data-size="${size}" title="Add size ${size} to bag">
          ${size}
        </button>
      `).join('');

      const badgeHtml = product.badge ? `<span class="card-badge">${product.badge}</span>` : '';

      return `
        <article class="product-card" data-id="${product.id}">
          <div class="product-image-container" data-action="open-modal" data-id="${product.id}">
            ${badgeHtml}
            <img 
              src="${primaryImg}" 
              alt="${product.name}" 
              class="product-img"
              loading="lazy"
            >
            <img 
              src="${secondaryImg}" 
              alt="${product.name} — Editorial detail" 
              class="product-img product-img-secondary"
              loading="lazy"
            >
            <div class="quick-size-bar" onclick="event.stopPropagation()">
              <span class="quick-size-label">Select:</span>
              ${sizePills}
            </div>
          </div>
          <div class="product-meta">
            <div class="product-category-row">
              <span class="product-category">${product.category}</span>
              <div class="color-dots">${colorDots}</div>
            </div>
            <h3 class="product-name" data-action="open-modal" data-id="${product.id}">${product.name}</h3>
            <span class="product-fabric">${product.composition}</span>
            <span class="product-price">$${product.price.toLocaleString()}</span>
          </div>
        </article>
      `;
    }).join('');

    dom.productGrid.innerHTML = html;

    // Attach click events to quick size buttons
    const quickSizeBtns = dom.productGrid.querySelectorAll('.quick-size-btn');
    quickSizeBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const pId = btn.getAttribute('data-product-id');
        const size = btn.getAttribute('data-size');
        const product = state.products.find(p => p.id === pId);
        if (product) {
          addToBag(product, size, product.colors[0]?.name || 'Default');
          openBagDrawer();
          showToast(`Added to bag: ${product.name} (${size})`);
        }
      });
    });

    // Attach click events for opening product modal
    const openModalElements = dom.productGrid.querySelectorAll('[data-action="open-modal"]');
    openModalElements.forEach(el => {
      el.addEventListener('click', () => {
        const pId = el.getAttribute('data-id');
        const product = state.products.find(p => p.id === pId);
        if (product) {
          openProductModal(product);
        }
      });
    });
  }

  // --- PRODUCT MODAL ---
  function openProductModal(product) {
    state.selectedProductForModal = product;
    state.selectedSizeInModal = product.sizes[0] || 'M';
    state.selectedColorInModal = product.colors[0]?.name || 'Standard';

    const sizePillsHtml = product.sizes.map((s, idx) => `
      <button class="size-pill ${idx === 0 ? 'active' : ''}" data-size="${s}">${s}</button>
    `).join('');

    const colorBtnsHtml = product.colors.map((c, idx) => `
      <button class="color-choice-btn ${idx === 0 ? 'active' : ''}" data-color="${c.name}">
        <span class="color-dot" style="background-color: ${c.hex};"></span>
        <span>${c.name}</span>
      </button>
    `).join('');

    const specsHtml = product.details ? product.details.map(d => `<li>${d}</li>`).join('') : '';

    dom.productModalBody.innerHTML = `
      <div class="modal-gallery-col">
        <img src="${product.images[0]}" alt="${product.name}" class="modal-main-img" id="modalMainImg">
      </div>
      <div class="modal-info-col">
        <div>
          ${product.badge ? `<span class="modal-badge">${product.badge}</span>` : ''}
          <h2 class="modal-title">${product.name}</h2>
          <span class="modal-fabric">${product.composition}</span>
        </div>

        <div class="modal-price">$${product.price.toLocaleString()} USD</div>

        <p class="modal-description">${product.description}</p>
        <p class="modal-description" style="font-size: 0.82rem; color: var(--text-muted);">
          <strong>Fit Guideline:</strong> ${product.fit}
        </p>

        <!-- Color Selector -->
        <div class="modal-selector-group">
          <div class="selector-header">
            <span class="selector-label">Atelier Palette</span>
            <span class="selected-val" id="modalSelectedColor">${state.selectedColorInModal}</span>
          </div>
          <div class="color-options" id="modalColorOptions">
            ${colorBtnsHtml}
          </div>
        </div>

        <!-- Size Selector -->
        <div class="modal-selector-group">
          <div class="selector-header">
            <span class="selector-label">Select Proportion</span>
            <span class="selected-val" id="modalSelectedSize">${state.selectedSizeInModal}</span>
          </div>
          <div class="size-options" id="modalSizeOptions">
            ${sizePillsHtml}
          </div>
        </div>

        <button class="modal-add-btn" id="modalAddToBagBtn">ADD TO SHOPPING BAG</button>

        <ul class="modal-specs-list">
          ${specsHtml}
          <li>Complimentary worldwide courier packaging included</li>
          <li>Full 30-day exchange allowance from delivery</li>
        </ul>
      </div>
    `;

    // Bind size selectors
    const sizePills = dom.productModalBody.querySelectorAll('.size-pill');
    sizePills.forEach(pill => {
      pill.addEventListener('click', () => {
        sizePills.forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        state.selectedSizeInModal = pill.getAttribute('data-size');
        const disp = document.getElementById('modalSelectedSize');
        if (disp) disp.textContent = state.selectedSizeInModal;
      });
    });

    // Bind color selectors
    const colorBtns = dom.productModalBody.querySelectorAll('.color-choice-btn');
    colorBtns.forEach(cbtn => {
      cbtn.addEventListener('click', () => {
        colorBtns.forEach(b => b.classList.remove('active'));
        cbtn.classList.add('active');
        state.selectedColorInModal = cbtn.getAttribute('data-color');
        const disp = document.getElementById('modalSelectedColor');
        if (disp) disp.textContent = state.selectedColorInModal;
      });
    });

    // Bind Add button
    const addBtn = document.getElementById('modalAddToBagBtn');
    if (addBtn) {
      addBtn.addEventListener('click', () => {
        addToBag(product, state.selectedSizeInModal, state.selectedColorInModal);
        closeProductModal();
        openBagDrawer();
        showToast(`Added to bag: ${product.name} (${state.selectedSizeInModal})`);
      });
    }

    dom.productModal.classList.add('open');
    dom.productModalBackdrop.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeProductModal() {
    dom.productModal.classList.remove('open');
    dom.productModalBackdrop.classList.remove('active');
    document.body.style.overflow = '';
  }

  // --- BAG / CART MANAGEMENT ---
  function loadBagFromStorage() {
    try {
      const stored = localStorage.getItem('alura_cart_v1');
      state.bag = stored ? JSON.parse(stored) : [];
    } catch (e) {
      state.bag = [];
    }
  }

  function saveBagToStorage() {
    try {
      localStorage.setItem('alura_cart_v1', JSON.stringify(state.bag));
    } catch (e) {
      console.warn('Could not save to localStorage:', e);
    }
  }

  function addToBag(product, size, color) {
    const existingIndex = state.bag.findIndex(
      item => item.id === product.id && item.size === size && item.color === color
    );

    if (existingIndex > -1) {
      state.bag[existingIndex].quantity += 1;
    } else {
      state.bag.push({
        id: product.id,
        name: product.name,
        price: product.price,
        size: size,
        color: color,
        image: product.images[0],
        category: product.category,
        quantity: 1
      });
    }

    saveBagToStorage();
    updateBagBadge();
    renderBagItems();
  }

  function updateBagBadge() {
    const totalCount = state.bag.reduce((sum, item) => sum + item.quantity, 0);
    dom.bagCountBadge.textContent = totalCount;
    dom.bagDrawerCount.textContent = `(${totalCount} ITEM${totalCount === 1 ? '' : 'S'})`;
  }

  function renderBagItems() {
    if (state.bag.length === 0) {
      dom.bagItemsList.innerHTML = `
        <div class="bag-empty">
          <p class="bag-empty-text">Your shopping bag is empty.</p>
          <p class="bag-empty-sub">Explore our curated editions and architectural tailoring.</p>
        </div>
      `;
      dom.bagSubtotalAmount.textContent = '$0.00';
      dom.openCheckoutBtn.disabled = true;
      dom.openCheckoutBtn.style.opacity = '0.4';
      dom.openCheckoutBtn.style.cursor = 'not-allowed';
      return;
    }

    dom.openCheckoutBtn.disabled = false;
    dom.openCheckoutBtn.style.opacity = '1';
    dom.openCheckoutBtn.style.cursor = 'pointer';

    let subtotal = 0;

    const html = state.bag.map((item, index) => {
      const itemTotal = item.price * item.quantity;
      subtotal += itemTotal;

      return `
        <div class="bag-item" data-index="${index}">
          <div class="bag-item-thumb">
            <img src="${item.image}" alt="${item.name}">
          </div>
          <div class="bag-item-details">
            <div>
              <h4 class="bag-item-title">${item.name}</h4>
              <div class="bag-item-meta">${item.size} &bull; ${item.color}</div>
            </div>
            <div class="bag-item-bottom">
              <div class="quantity-stepper">
                <button class="qty-btn" data-action="dec" data-index="${index}">&minus;</button>
                <span class="qty-number">${item.quantity}</span>
                <button class="qty-btn" data-action="inc" data-index="${index}">&plus;</button>
              </div>
              <span class="bag-item-price">$${itemTotal.toLocaleString()}</span>
            </div>
            <button class="bag-item-remove" data-action="remove" data-index="${index}">Remove</button>
          </div>
        </div>
      `;
    }).join('');

    dom.bagItemsList.innerHTML = html;
    dom.bagSubtotalAmount.textContent = `$${subtotal.toLocaleString()}.00`;

    // Attach quantity stepper events
    const stepperBtns = dom.bagItemsList.querySelectorAll('.qty-btn');
    stepperBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.getAttribute('data-index'), 10);
        const action = btn.getAttribute('data-action');
        if (action === 'inc') {
          state.bag[idx].quantity += 1;
        } else if (action === 'dec') {
          if (state.bag[idx].quantity > 1) {
            state.bag[idx].quantity -= 1;
          } else {
            state.bag.splice(idx, 1);
          }
        }
        saveBagToStorage();
        updateBagBadge();
        renderBagItems();
      });
    });

    // Attach remove events
    const removeBtns = dom.bagItemsList.querySelectorAll('.bag-item-remove');
    removeBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.getAttribute('data-index'), 10);
        const removed = state.bag.splice(idx, 1)[0];
        saveBagToStorage();
        updateBagBadge();
        renderBagItems();
        if (removed) {
          showToast(`Removed from bag: ${removed.name}`);
        }
      });
    });
  }

  function openBagDrawer() {
    renderBagItems();
    dom.bagDrawer.classList.add('open');
    dom.bagBackdrop.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeBagDrawer() {
    dom.bagDrawer.classList.remove('open');
    dom.bagBackdrop.classList.remove('active');
    document.body.style.overflow = '';
  }

  // --- CHECKOUT FLOW ---
  function openCheckout() {
    if (state.bag.length === 0) return;
    closeBagDrawer();

    let subtotal = 0;
    const itemsHtml = state.bag.map(item => {
      const itemTotal = item.price * item.quantity;
      subtotal += itemTotal;
      return `
        <div class="summary-item-row">
          <div>
            <div class="summary-item-title">${item.name}</div>
            <div class="summary-item-sub">Proportion: ${item.size} &bull; Color: ${item.color} &bull; Qty: ${item.quantity}</div>
          </div>
          <div class="summary-item-price">$${itemTotal.toLocaleString()}</div>
        </div>
      `;
    }).join('');

    const tax = Math.round(subtotal * 0.0825);
    const grandTotal = subtotal + tax;

    dom.checkoutSummaryItems.innerHTML = itemsHtml;
    dom.checkoutSubtotal.textContent = `$${subtotal.toLocaleString()}.00`;
    dom.checkoutTax.textContent = `$${tax.toLocaleString()}.00`;
    dom.checkoutTotal.textContent = `$${grandTotal.toLocaleString()}.00`;

    dom.checkoutModal.classList.add('open');
    dom.checkoutModalBackdrop.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeCheckout() {
    dom.checkoutModal.classList.remove('open');
    dom.checkoutModalBackdrop.classList.remove('active');
    document.body.style.overflow = '';
  }

  async function handleCheckoutSubmit(e) {
    e.preventDefault();

    const name = document.getElementById('clientName').value.trim();
    const email = document.getElementById('clientEmail').value.trim();
    const address = document.getElementById('shipAddress').value.trim();
    const city = document.getElementById('shipCity').value.trim();
    const postal = document.getElementById('shipPostal').value.trim();
    const country = document.getElementById('shipCountry').value;

    if (!name || !email || !address || !city || !postal) {
      alert('Please complete all delivery details.');
      return;
    }

    // UI Loading state
    dom.checkoutSpinner.style.display = 'inline-block';
    dom.submitOrderBtnText.textContent = 'AUTHORIZING WITH ATELIER...';
    dom.submitOrderBtn.disabled = true;

    const payload = {
      customer: { name, email },
      shippingAddress: { address, city, postalCode: postal, country },
      items: state.bag.map(i => ({ id: i.id, quantity: i.quantity, size: i.size, color: i.color }))
    };

    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      let orderData;
      if (res.ok) {
        orderData = await res.json();
      } else {
        throw new Error('API server returned error');
      }

      // Order Success
      showOrderConfirmation(orderData);
    } catch (err) {
      console.warn('Backend API offline or error, simulating graceful confirmation:', err);
      // Graceful fallback for offline demo
      const randomSuffix = Math.floor(100000 + Math.random() * 900000);
      const deliveryDate = new Date();
      deliveryDate.setDate(deliveryDate.getDate() + 3);

      const mockOrder = {
        orderId: `ALR-2026-${randomSuffix}`,
        createdAt: new Date().toISOString(),
        customer: { name, email },
        delivery: {
          carrier: 'ALURA White-Glove Courier',
          estimatedArrival: deliveryDate.toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric'
          }),
          packaging: 'Rigid Atelier Box with Silk Ribbon & Garment Dust Bag'
        },
        pricing: {
          grandTotal: state.bag.reduce((s, i) => s + (i.price * i.quantity), 0) * 1.0825
        }
      };
      showOrderConfirmation(mockOrder);
    } finally {
      dom.checkoutSpinner.style.display = 'none';
      dom.submitOrderBtnText.textContent = 'CONFIRM & AUTHORIZE ORDER';
      dom.submitOrderBtn.disabled = false;
    }
  }

  function showOrderConfirmation(order) {
    closeCheckout();

    // Clear cart
    state.bag = [];
    saveBagToStorage();
    updateBagBadge();
    renderBagItems();

    dom.confirmCardContent.innerHTML = `
      <div class="confirm-seal">ALURA ATELIER NO. 04</div>
      <h2 class="confirm-heading">Your Order is Registered</h2>
      <p class="confirm-sub">
        Thank you, ${order.customer.name}. Our artisans in the Paris and Porto workrooms 
        have been notified to prepare your selection with archival care.
      </p>

      <div class="order-ref-box">
        <div>
          <span class="ref-label">Atelier Reference</span>
          <div class="ref-value">${order.orderId}</div>
        </div>
        <div>
          <span class="ref-label">Estimated Courier Arrival</span>
          <div class="ref-value">${order.delivery?.estimatedArrival || 'In 3 Business Days'}</div>
        </div>
        <div>
          <span class="ref-label">White-Glove Courier</span>
          <div class="ref-value">Complimentary</div>
        </div>
      </div>

      <p style="font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 2rem;">
        A confidential dispatch dossier has been sent to <strong>${order.customer.email}</strong>.
      </p>

      <div class="confirm-actions">
        <button class="cta-btn cta-btn-primary" id="confirmDoneBtn">RETURN TO ATELIER</button>
      </div>
    `;

    dom.orderConfirmModal.classList.add('open');
    dom.orderConfirmBackdrop.classList.add('active');
    document.body.style.overflow = 'hidden';

    const doneBtn = document.getElementById('confirmDoneBtn');
    if (doneBtn) {
      doneBtn.addEventListener('click', () => {
        dom.orderConfirmModal.classList.remove('open');
        dom.orderConfirmBackdrop.classList.remove('active');
        document.body.style.overflow = '';
      });
    }
  }

  // --- CLIENT SERVICES INFO MODAL ---
  const infoContentMap = {
    concierge: {
      title: 'Concierge & Private Atelier Appointments',
      content: `
        <p>ALURA offers bespoke private salons at our spaces in Paris (8e Arrondissement) and New York (SoHo). Clients may reserve one-on-one appointments with our master fitters to review forthcoming editions, request custom unlined alterations, or commission bespoke fabrications.</p>
        <p>To arrange a private viewing or video consultation with our creative directors, please contact: <strong>concierge@alura.com</strong> or telephone +33 1 42 68 55 00.</p>
      `
    },
    shipping: {
      title: 'Complimentary White-Glove Courier',
      content: `
        <p>All ALURA garments are dispatched via prioritized express couriers with carbon-offset logistics. Every package is delivered in our signature rigid matte alabaster box, protected by water-resistant exterior packaging.</p>
        <p>Each coat, blazer, and gown includes a custom cedar hanger and archival cotton garment dust bag. No delivery fees or import tariffs are charged to our international clients.</p>
      `
    },
    returns: {
      title: 'Exchanges & 30-Day Atelier Returns',
      content: `
        <p>Should any piece not conform impeccably to your posture or expectations, we offer complimentary return pickup within 30 days of receipt.</p>
        <p>Garments must remain unwashed, unworn, and retain all security seals and atelier tags intact. Bespoke monogrammed pieces are final sale.</p>
      `
    },
    care: {
      title: 'Garment Care & Restorative Mending',
      content: `
        <p>Noble fibers require mindful preservation. Cashmere knitwear should be aired flat and gently de-pilled with a natural bristle brush. Double-faced wool overcoats should only be dry cleaned once per season by a verified luxury fabric specialist.</p>
        <p>Every ALURA garment carries our Lifelong Repair Guarantee: should your piece require button reinforcement, seam tightening, or re-weaving over decades of wear, our atelier will repair it without charge.</p>
      `
    },
    sustainability: {
      title: 'Circular Commitment & Traceability',
      content: `
        <p>We do not produce seasonal deadstock. Every edition is manufactured in strictly limited runs of 100 to 250 pieces based on verified yarn orders.</p>
        <p>100% of our wool and cashmere is traced directly to pastoral cooperatives adhering to the Responsible Wool Standard. Our packaging is 100% post-consumer recycled paperboard, free of virgin plastics and toxic bleaches.</p>
      `
    }
  };

  function openInfoModal(type) {
    const data = infoContentMap[type];
    if (!data) return;

    dom.infoModalContent.innerHTML = `
      <h3>${data.title}</h3>
      ${data.content}
    `;

    dom.infoModal.classList.add('open');
    dom.infoModalBackdrop.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeInfoModal() {
    dom.infoModal.classList.remove('open');
    dom.infoModalBackdrop.classList.remove('active');
    document.body.style.overflow = '';
  }

  // --- TOAST NOTIFICATIONS ---
  function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `
      <svg class="icon" style="width: 14px; height: 14px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
        <polyline points="20 6 9 17 4 12"></polyline>
      </svg>
      <span>${message}</span>
    `;

    dom.toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('removing');
      setTimeout(() => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      }, 350);
    }, 2800);
  }

  // --- FILTER & SEARCH HELPERS ---
  function resetAllFilters() {
    state.activeCategory = 'All';
    state.searchQuery = '';
    state.activeSort = 'featured';

    // Update UI tabs
    const tabBtns = dom.categoryTabs.querySelectorAll('.tab-btn');
    tabBtns.forEach(btn => {
      if (btn.getAttribute('data-category') === 'All') {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    dom.sortSelect.value = 'featured';
    dom.searchInput.value = '';
    dom.activeFilterBadge.style.display = 'none';

    renderProducts();
  }

  // --- EVENT BINDINGS ---
  function bindEvents() {
    // Category Tabs
    dom.categoryTabs.addEventListener('click', (e) => {
      const target = e.target.closest('.tab-btn');
      if (!target) return;

      const category = target.getAttribute('data-category');
      state.activeCategory = category;

      dom.categoryTabs.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
      target.classList.add('active');

      if (category !== 'All') {
        dom.activeFilterBadge.style.display = 'inline-flex';
        dom.activeFilterText.textContent = `Category: ${category}`;
      } else {
        dom.activeFilterBadge.style.display = 'none';
      }

      renderProducts();
    });

    // Reset Filter Button Badge
    if (dom.resetFilterBtn) {
      dom.resetFilterBtn.addEventListener('click', () => {
        resetAllFilters();
      });
    }

    // Sort Dropdown
    dom.sortSelect.addEventListener('change', (e) => {
      state.activeSort = e.target.value;
      renderProducts();
    });

    // Search Toggle
    dom.searchToggleBtn.addEventListener('click', () => {
      dom.searchDropdown.classList.toggle('open');
      if (dom.searchDropdown.classList.contains('open')) {
        dom.searchInput.focus();
      }
    });

    // Search Input
    let debounceTimer;
    dom.searchInput.addEventListener('input', (e) => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        state.searchQuery = e.target.value.trim();
        renderProducts();
      }, 250);
    });

    // Search Clear
    dom.searchClearBtn.addEventListener('click', () => {
      dom.searchInput.value = '';
      state.searchQuery = '';
      renderProducts();
      dom.searchDropdown.classList.remove('open');
    });

    // Bag Drawer Toggle
    dom.bagToggleBtn.addEventListener('click', openBagDrawer);
    dom.closeBagBtn.addEventListener('click', closeBagDrawer);
    dom.bagBackdrop.addEventListener('click', closeBagDrawer);
    dom.continueShoppingBtn.addEventListener('click', closeBagDrawer);

    // Product Modal Close
    dom.closeProductModalBtn.addEventListener('click', closeProductModal);
    dom.productModalBackdrop.addEventListener('click', closeProductModal);

    // Checkout Modal Open/Close
    dom.openCheckoutBtn.addEventListener('click', openCheckout);
    dom.closeCheckoutModalBtn.addEventListener('click', closeCheckout);
    dom.checkoutModalBackdrop.addEventListener('click', closeCheckout);
    dom.checkoutForm.addEventListener('submit', handleCheckoutSubmit);

    // Order Confirm Backdrop Close
    dom.orderConfirmBackdrop.addEventListener('click', () => {
      dom.orderConfirmModal.classList.remove('open');
      dom.orderConfirmBackdrop.classList.remove('active');
      document.body.style.overflow = '';
    });

    // Mobile Drawer
    dom.mobileMenuBtn.addEventListener('click', () => {
      dom.mobileDrawer.classList.add('open');
    });
    dom.closeMobileDrawerBtn.addEventListener('click', () => {
      dom.mobileDrawer.classList.remove('open');
    });
    dom.mobileDrawer.addEventListener('click', (e) => {
      if (e.target === dom.mobileDrawer) {
        dom.mobileDrawer.classList.remove('open');
      }
    });
    dom.mobileDrawer.querySelectorAll('.mobile-link').forEach(link => {
      link.addEventListener('click', () => {
        dom.mobileDrawer.classList.remove('open');
      });
    });

    // Newsletter Form
    dom.newsletterForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = dom.newsletterEmail.value.trim();
      if (!email) return;

      dom.newsletterFeedback.textContent = 'Registering invitation...';
      dom.newsletterFeedback.className = 'form-feedback';

      try {
        const res = await fetch('/api/newsletter', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email })
        });

        if (res.ok) {
          const data = await res.json();
          dom.newsletterFeedback.textContent = data.message || 'Invitation registered.';
          dom.newsletterFeedback.className = 'form-feedback success';
          dom.newsletterEmail.value = '';
        } else {
          throw new Error('Registration error');
        }
      } catch (err) {
        // Fallback for offline demo
        dom.newsletterFeedback.textContent = `Your invitation to private salon presentations has been registered for ${email}.`;
        dom.newsletterFeedback.className = 'form-feedback success';
        dom.newsletterEmail.value = '';
      }
    });

    // Client Services Modals (Footer Links)
    const modalTriggers = document.querySelectorAll('.footer-modal-trigger');
    modalTriggers.forEach(trig => {
      trig.addEventListener('click', (e) => {
        e.preventDefault();
        const modalType = trig.getAttribute('data-modal');
        openInfoModal(modalType);
      });
    });

    dom.closeInfoModalBtn.addEventListener('click', closeInfoModal);
    dom.infoModalBackdrop.addEventListener('click', closeInfoModal);

    // Footer Category Filter Links
    const footerCatLinks = document.querySelectorAll('.footer-list a[data-cat]');
    footerCatLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        const cat = link.getAttribute('data-cat');
        state.activeCategory = cat;
        dom.categoryTabs.querySelectorAll('.tab-btn').forEach(btn => {
          if (btn.getAttribute('data-category') === cat) {
            btn.classList.add('active');
          } else {
            btn.classList.remove('active');
          }
        });
        renderProducts();
      });
    });

    // ESC key closes any open modal or drawer
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeProductModal();
        closeBagDrawer();
        closeCheckout();
        closeInfoModal();
        dom.orderConfirmModal.classList.remove('open');
        dom.orderConfirmBackdrop.classList.remove('active');
        dom.mobileDrawer.classList.remove('open');
        dom.searchDropdown.classList.remove('open');
        document.body.style.overflow = '';
      }
    });
  }

  // Run on DOM load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
