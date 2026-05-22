class WindowPanel {
  constructor({ parent = document.body, title = "Debug Window", x = 10, y = 10, width = 250, closable = false, collapsible = false } = {}) {
    this.components = {}; // Dictionary mapping IDs to components
    this.collapsed = false;

    this.panel = new Panel({ parent, title }); // Passes "title" to header
    
    const el = this.panel.root.el;
    Object.assign(el.style, { position: "fixed", left: `${x}px`, top: `${y}px`, width: `${width}px`, zIndex: 1000 });

    this.header = this.panel.header;

    if (this.header) {
      Object.assign(this.header.style, { display: "flex", alignItems: "center" });
      this.#enableDrag(el, this.header);

      if (collapsible) {
        this.collapseBtn = document.createElement("span");
        this.collapseBtn.textContent = "▾";
        this.collapseBtn.style.marginLeft = "auto";
        this.collapseBtn.style.cursor = "pointer";
        this.collapseBtn.onclick = (e) => { e.stopPropagation(); this.toggleCollapse(); };
        this.header.appendChild(this.collapseBtn);
      }

      if (closable) {
        this.closeBtn = document.createElement("span");
        this.closeBtn.textContent = "✕";
        this.closeBtn.style.marginLeft = collapsible ? "10px" : "auto";
        this.closeBtn.style.cursor = "pointer";
        this.closeBtn.onclick = (e) => { e.stopPropagation(); el.remove(); };
        this.header.appendChild(this.closeBtn);
      }
    }
  }

  toggleCollapse() {
    this.collapsed = !this.collapsed;
    this.panel.content.style.display = this.collapsed ? "none" : "";
    if (this.collapseBtn) this.collapseBtn.textContent = this.collapsed ? "▸" : "▾";
  }

  // --- API for adding components ---
  // id: unique string used to grab this component later
  // label: text shown to the user

  addSlider(id, label, min, max, value = 1, onChange = () => {}) {
    const slider = new Slider({ parent: this.panel.content, label, min, max, value, onChange });
    this.components[id] = slider;
    onChange(value); // Trigger initial state
    return this; // Allows method chaining
  }

  addNumberInput(id, label, min, max, value = 0, onChange = () => {}) {
    const numInput = new NumberInput({ parent: this.panel.content, label, min, max, value, onChange });
    this.components[id] = numInput;
    onChange(value);
    return this;
  }

  addButton(id, label, onClick = () => {}) {
    const btn = new Button({ parent: this.panel.content, label, onClick });
    this.components[id] = btn;
    return this;
  }

  // --- API for Real-Time Syncing ---

  // Read a value from the UI
  getValue(id) {
    if (!this.components[id]) return null;
    return this.components[id].value;
  }

  // Update the UI visually from the game loop
  // silent = true ensures we don't fire the onChange callback and cause an infinite loop
  setValue(id, val, silent = true) {
    if (this.components[id] && this.components[id].setValue) {
      this.components[id].setValue(val, silent);
    }
  }

  #enableDrag(root, handle) {
    let dragging = false, ox = 0, oy = 0, activePointerId = null;
    handle.style.touchAction = "none";

    handle.onpointerdown = e => {
      e.preventDefault();
      dragging = true;
      activePointerId = e.pointerId;
      const rect = root.getBoundingClientRect();
      ox = e.clientX - rect.left;
      oy = e.clientY - rect.top;
      handle.setPointerCapture(activePointerId);
    };

    handle.onpointermove = e => {
      if (!dragging || e.pointerId !== activePointerId) return;
      e.preventDefault();
      root.style.left = `${e.clientX - ox}px`;
      root.style.top = `${e.clientY - oy}px`;
    };

    const stopDrag = e => {
      if (e.pointerId !== activePointerId) return;
      dragging = false;
      handle.releasePointerCapture(activePointerId);
      activePointerId = null;
    };

    handle.onpointerup = stopDrag;
    handle.onpointercancel = stopDrag;
  }
  addText(id, text) {
    const el = document.createElement("div");
    el.className = "panelText";
    el.textContent = text;
    el.style.marginBottom = "4px";
    el.style.fontSize = "0.9em";
    
    this.panel.content.appendChild(el);
    
    // Store in our dictionary so we can update it later
    this.components[id] = { el: el }; 
    return this; // Maintain chaining
  }

  setText(id, text) {
    if (this.components[id] && this.components[id].el) {
      this.components[id].el.textContent = text;
    } else {
      // If the ID doesn't exist yet, create it automatically
      this.addText(id, text);
    }
  }
}
