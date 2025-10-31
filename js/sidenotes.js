// Sidenotes for Hugo Bear Blog with Mobile Popup and Long Collapse Support
(function() {
    'use strict';
    
    const Sidenotes = {
        // 配置
        config: {
            minWidthForSidenotes: 1400,  // 显示侧注的最小宽度
            minWidthForPopup: 768,       // 显示弹窗的最小宽度
            sidenoteWidth: 240,
            marginTop: 20,
            spacing: 30,
            maxSidenoteHeight: 400,      // 侧注的最大高度（像素）
            collapseThreshold: 350       // 触发折叠的高度阈值
        },
        
        // 状态
        currentPopup: null,
        footnotes: [],
        sidenotes: [],
        
        // 初始化
        init() {
            setTimeout(() => {
                this.collectFootnotes();
                
                if (this.footnotes.length === 0) return;
                
                if (window.innerWidth >= this.config.minWidthForSidenotes) {
                    // 桌面端：侧注
                    this.setupSidenotes();
                } else {
                    // 移动端：准备弹窗
                    this.setupMobilePopups();
                }
                
                this.bindResizeHandler();
            }, 100);
        },
        
        // 收集所有脚注
        collectFootnotes() {
            this.footnotes = [];
            
            // Hugo 默认格式
            const hugoRefs = document.querySelectorAll('sup[id^="fnref"] a[href^="#fn"]');
            hugoRefs.forEach(ref => {
                const id = ref.getAttribute('href').replace('#fn:', '').replace('#fn', '');
                const footnoteElement = document.querySelector(`#fn\\:${id}, #fn${id}`);
                
                if (footnoteElement) {
                    let content = footnoteElement.innerHTML;
                    content = content.replace(/<a[^>]*href="#fnref[^"]*"[^>]*>.*?<\/a>/gi, '');
                    content = content.replace(/↩︎/g, '');
                    
                    this.footnotes.push({
                        id: id,
                        number: this.footnotes.length + 1,
                        ref: ref.parentElement,
                        link: ref,
                        footnote: footnoteElement,
                        content: content.trim()
                    });
                }
            });
            
            // ox-hugo 格式
            const oxhugoRefs = document.querySelectorAll('.footnote-ref');
            oxhugoRefs.forEach(ref => {
                const id = ref.getAttribute('href').replace('#fn.', '').replace('#fn:', '');
                const footnoteElement = document.querySelector(`.footdef#fn\\.${id}, #fn\\:${id}`);
                
                if (footnoteElement && !this.footnotes.find(f => f.id === id)) {
                    let content = footnoteElement.querySelector('.footpara')?.innerHTML 
                                || footnoteElement.innerHTML;
                    content = content.replace(/<a[^>]*class="footnum"[^>]*>.*?<\/a>/gi, '');
                    
                    this.footnotes.push({
                        id: id,
                        number: this.footnotes.length + 1,
                        ref: ref,
                        link: ref,
                        footnote: footnoteElement,
                        content: content.trim()
                    });
                }
            });
        },
        
        // === 桌面端侧注功能 ===
        setupSidenotes() {
            this.createSidenoteColumns();
            this.convertFootnotesToSidenotes();
            this.positionSidenotes();
            this.bindSidenoteEvents();
            this.setupLongSidenotes();
        },
        
        createSidenoteColumns() {
            document.querySelectorAll('.sidenote-column').forEach(el => el.remove());
            
            this.leftColumn = document.createElement('div');
            this.leftColumn.className = 'sidenote-column sidenote-column-left';
            
            this.rightColumn = document.createElement('div');
            this.rightColumn.className = 'sidenote-column sidenote-column-right';
            
            document.body.appendChild(this.leftColumn);
            document.body.appendChild(this.rightColumn);
        },
        
        convertFootnotesToSidenotes() {
            this.sidenotes = [];
            
            this.footnotes.forEach((footnote, index) => {
                // 创建侧注结构，包含外层和内层包装器
                const sidenote = document.createElement('div');
                sidenote.className = 'sidenote';
                sidenote.id = `sidenote-${footnote.id}`;
                
                // 创建外层包装器（用于滚动）
                const outerWrapper = document.createElement('div');
                outerWrapper.className = 'sidenote-outer-wrapper';
                
                // 创建内层包装器（包含实际内容）
                const innerWrapper = document.createElement('div');
                innerWrapper.className = 'sidenote-inner-wrapper';
                innerWrapper.innerHTML = `
                    <span class="sidenote-number">${footnote.number}</span>
                    <div class="sidenote-content">${footnote.content}</div>
                `;
                
                outerWrapper.appendChild(innerWrapper);
                sidenote.appendChild(outerWrapper);
                
                // 添加省略号指示器
                const moreIndicator = document.createElement('div');
                moreIndicator.className = 'sidenote-more-indicator';
                moreIndicator.innerHTML = '···';
                sidenote.appendChild(moreIndicator);
                
                const column = (index % 2 === 0) ? this.rightColumn : this.leftColumn;
                column.appendChild(sidenote);
                
                this.sidenotes.push({
                    element: sidenote,
                    outerWrapper: outerWrapper,
                    innerWrapper: innerWrapper,
                    moreIndicator: moreIndicator,
                    ref: footnote.ref,
                    link: footnote.link,
                    column: column,
                    footnote: footnote.footnote,
                    content: footnote.content
                });
                
                if (footnote.footnote) {
                    footnote.footnote.style.display = 'none';
                }
                
                footnote.link.classList.add('sidenote-ref');
                footnote.link.setAttribute('data-sidenote-id', footnote.id);
                
                // 阻止默认跳转
                footnote.link.addEventListener('click', (e) => {
                    e.preventDefault();
                    if (window.innerWidth >= this.config.minWidthForSidenotes) {
                        sidenote.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        sidenote.classList.add('highlighted');
                        setTimeout(() => {
                            sidenote.classList.remove('highlighted');
                        }, 2000);
                    }
                });
            });
            
            const footnoteSection = document.querySelector('.footnotes, #footnotes, .footdefs');
            if (footnoteSection) {
                footnoteSection.style.display = 'none';
            }
        },
        
        positionSidenotes() {
            let lastLeftBottom = 0;
            let lastRightBottom = 0;
            
            this.sidenotes.forEach((sidenote) => {
                const ref = sidenote.ref;
                const refRect = ref.getBoundingClientRect();
                const refTop = refRect.top + window.scrollY;
                
                let idealTop = refTop - this.config.marginTop;
                
                if (sidenote.column === this.leftColumn) {
                    idealTop = Math.max(idealTop, lastLeftBottom + this.config.spacing);
                    lastLeftBottom = idealTop + sidenote.element.offsetHeight;
                } else {
                    idealTop = Math.max(idealTop, lastRightBottom + this.config.spacing);
                    lastRightBottom = idealTop + sidenote.element.offsetHeight;
                }
                
                sidenote.element.style.top = `${idealTop}px`;
            });
        },
        
        // 设置长侧注的折叠功能
        setupLongSidenotes() {
            this.sidenotes.forEach((sidenote) => {
                const outerWrapper = sidenote.outerWrapper;
                const innerWrapper = sidenote.innerWrapper;
                const element = sidenote.element;
                
                // 检查内容高度
                const contentHeight = innerWrapper.scrollHeight;
                
                if (contentHeight > this.config.collapseThreshold) {
                    // 标记为超长侧注
                    element.classList.add('cut-off');
                    
                    // 设置最大高度
                    outerWrapper.style.maxHeight = `${this.config.maxSidenoteHeight}px`;
                    outerWrapper.style.overflowY = 'auto';
                    
                    // 初始显示省略号指示器
                    element.classList.add('show-more-indicator');
                    
                    // 添加滚动监听器
                    this.addScrollListener(sidenote);
                    
                    // 添加展开/折叠功能
                    this.addExpandToggle(sidenote);
                } else {
                    element.classList.remove('cut-off', 'show-more-indicator');
                    outerWrapper.style.maxHeight = '';
                    outerWrapper.style.overflowY = '';
                }
            });
        },
        
        // 添加滚动监听器
        addScrollListener(sidenote) {
            const outerWrapper = sidenote.outerWrapper;
            const element = sidenote.element;
            
            outerWrapper.addEventListener('scroll', () => {
                const isAtBottom = Math.abs(
                    outerWrapper.scrollHeight - 
                    outerWrapper.scrollTop - 
                    outerWrapper.clientHeight
                ) < 5; // 5px 容差
                
                if (isAtBottom) {
                    element.classList.add('hide-more-indicator');
                } else {
                    element.classList.remove('hide-more-indicator');
                }
            });
        },
        
        // 添加展开/折叠切换功能
        addExpandToggle(sidenote) {
            const moreIndicator = sidenote.moreIndicator;
            const outerWrapper = sidenote.outerWrapper;
            const element = sidenote.element;
            
            moreIndicator.style.cursor = 'pointer';
            moreIndicator.title = '点击展开/折叠';
            
            moreIndicator.addEventListener('click', (e) => {
                e.stopPropagation();
                
                if (element.classList.contains('expanded')) {
                    // 折叠
                    element.classList.remove('expanded');
                    outerWrapper.style.maxHeight = `${this.config.maxSidenoteHeight}px`;
                    moreIndicator.innerHTML = '···';
                    
                    // 滚动到顶部
                    outerWrapper.scrollTop = 0;
                } else {
                    // 展开
                    element.classList.add('expanded');
                    outerWrapper.style.maxHeight = 'none';
                    moreIndicator.innerHTML = '×';
                    element.classList.add('hide-more-indicator');
                }
            });
        },
        
        bindSidenoteEvents() {
            this.sidenotes.forEach((sidenote) => {
                // 悬停高亮
                sidenote.ref.addEventListener('mouseenter', () => {
                    sidenote.element.classList.add('highlighted');
                });
                sidenote.ref.addEventListener('mouseleave', () => {
                    sidenote.element.classList.remove('highlighted');
                });
                
                sidenote.element.addEventListener('mouseenter', () => {
                    sidenote.link.classList.add('highlighted');
                });
                sidenote.element.addEventListener('mouseleave', () => {
                    sidenote.link.classList.remove('highlighted');
                });
                
                // 双击展开/折叠长侧注
                if (sidenote.element.classList.contains('cut-off')) {
                    sidenote.element.addEventListener('dblclick', (e) => {
                        if (!e.target.classList.contains('sidenote-more-indicator')) {
                            sidenote.moreIndicator.click();
                        }
                    });
                }
            });
        },
        
        // === 移动端弹窗功能（保持不变）===
        setupMobilePopups() {
            if (!document.querySelector('.footnote-popup-container')) {
                this.createPopupContainer();
            }
            
            this.footnotes.forEach((footnote) => {
                footnote.link.classList.add('footnote-popup-trigger');
                
                const newLink = footnote.link.cloneNode(true);
                footnote.link.parentNode.replaceChild(newLink, footnote.link);
                footnote.link = newLink;
                
                footnote.link.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    
                    if (window.innerWidth < this.config.minWidthForSidenotes) {
                        if (window.innerWidth >= this.config.minWidthForPopup) {
                            this.showPopup(footnote);
                        } else {
                            this.toggleInlineFootnote(footnote);
                        }
                    }
                });
            });
        },
        
        createPopupContainer() {
            const overlay = document.createElement('div');
            overlay.className = 'footnote-popup-overlay';
            overlay.style.display = 'none';
            
            const popup = document.createElement('div');
            popup.className = 'footnote-popup';
            popup.innerHTML = `
                <div class="footnote-popup-header">
                    <span class="footnote-popup-number"></span>
                    <button class="footnote-popup-close" aria-label="关闭">×</button>
                </div>
                <div class="footnote-popup-content"></div>
            `;
            
            overlay.appendChild(popup);
            document.body.appendChild(overlay);
            
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay || e.target.classList.contains('footnote-popup-close')) {
                    this.closePopup();
                }
            });
            
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && this.currentPopup) {
                    this.closePopup();
                }
            });
        },
        
        showPopup(footnote) {
            const overlay = document.querySelector('.footnote-popup-overlay');
            const popup = overlay.querySelector('.footnote-popup');
            const numberEl = popup.querySelector('.footnote-popup-number');
            const contentEl = popup.querySelector('.footnote-popup-content');
            
            numberEl.textContent = footnote.number;
            contentEl.innerHTML = footnote.content;
            
            overlay.style.display = 'flex';
            document.body.style.overflow = 'hidden';
            
            this.currentPopup = footnote;
            
            requestAnimationFrame(() => {
                overlay.classList.add('active');
            });
        },
        
        closePopup() {
            const overlay = document.querySelector('.footnote-popup-overlay');
            if (!overlay) return;
            
            overlay.classList.remove('active');
            
            setTimeout(() => {
                overlay.style.display = 'none';
                document.body.style.overflow = '';
                this.currentPopup = null;
            }, 300);
        },
        
        toggleInlineFootnote(footnote) {
            let container = footnote.ref.closest('p, li, div');
            if (!container) container = footnote.ref.parentElement;
            
            let inlineContainer = container.querySelector(`.footnote-inline[data-footnote-id="${footnote.id}"]`);
            
            if (inlineContainer) {
                if (inlineContainer.style.display === 'block') {
                    inlineContainer.style.display = 'none';
                    footnote.link.classList.remove('active');
                } else {
                    document.querySelectorAll('.footnote-inline').forEach(el => {
                        el.style.display = 'none';
                    });
                    document.querySelectorAll('.footnote-popup-trigger.active').forEach(el => {
                        el.classList.remove('active');
                    });
                    
                    inlineContainer.style.display = 'block';
                    footnote.link.classList.add('active');
                    
                    setTimeout(() => {
                        inlineContainer.scrollIntoView({ 
                            behavior: 'smooth', 
                            block: 'nearest' 
                        });
                    }, 100);
                }
            } else {
                document.querySelectorAll('.footnote-inline').forEach(el => {
                    el.style.display = 'none';
                });
                document.querySelectorAll('.footnote-popup-trigger.active').forEach(el => {
                    el.classList.remove('active');
                });
                
                inlineContainer = document.createElement('div');
                inlineContainer.className = 'footnote-inline';
                inlineContainer.setAttribute('data-footnote-id', footnote.id);
                inlineContainer.style.display = 'block';
                inlineContainer.innerHTML = `
                    <div class="footnote-inline-number">${footnote.number}</div>
                    <div class="footnote-inline-content">${footnote.content}</div>
                `;
                
                let insertAfter = footnote.ref;
                if (footnote.ref.tagName === 'SUP') {
                    insertAfter = footnote.ref;
                }
                
                insertAfter.parentNode.insertBefore(inlineContainer, insertAfter.nextSibling);
                
                footnote.link.classList.add('active');
                
                setTimeout(() => {
                    inlineContainer.scrollIntoView({ 
                        behavior: 'smooth', 
                        block: 'nearest' 
                    });
                }, 100);
            }
        },
        
        bindResizeHandler() {
            let resizeTimer;
            window.addEventListener('resize', () => {
                clearTimeout(resizeTimer);
                resizeTimer = setTimeout(() => {
                    this.handleResize();
                }, 250);
            });
        },
        
        handleResize() {
            const width = window.innerWidth;
            
            if (width >= this.config.minWidthForSidenotes) {
                this.cleanupMobile();
                this.setupSidenotes();
            } else {
                this.cleanupDesktop();
                this.setupMobilePopups();
            }
        },
        
        cleanupDesktop() {
            document.querySelectorAll('.sidenote-column').forEach(el => el.remove());
            
            this.footnotes.forEach(footnote => {
                if (footnote.footnote) {
                    footnote.footnote.style.display = '';
                }
                if (footnote.link) {
                    footnote.link.classList.remove('sidenote-ref', 'highlighted');
                }
            });
            
            const footnoteSection = document.querySelector('.footnotes, #footnotes, .footdefs');
            if (footnoteSection) {
                footnoteSection.style.display = '';
            }
        },
        
        cleanupMobile() {
            this.closePopup();
            document.querySelectorAll('.footnote-inline').forEach(el => el.remove());
            document.querySelectorAll('.footnote-popup-trigger').forEach(el => {
                el.classList.remove('footnote-popup-trigger', 'active');
            });
        }
    };
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => Sidenotes.init());
    } else {
        Sidenotes.init();
    }
    
    window.Sidenotes = Sidenotes;
})();