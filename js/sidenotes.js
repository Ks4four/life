// Sidenotes for Hugo Bear Blog with Mobile Popup Support
(function () {
    'use strict';

    const Sidenotes = {
        // 配置
        config: {
            minWidthForSidenotes: 1400,  // 显示侧注的最小宽度
            minWidthForPopup: 768,       // 显示弹窗的最小宽度（小于此值用展开式）
            sidenoteWidth: 240,
            marginTop: 20,
            spacing: 30
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
                const sidenote = document.createElement('div');
                sidenote.className = 'sidenote';
                sidenote.id = `sidenote-${footnote.id}`;
                sidenote.innerHTML = `
                    <span class="sidenote-number">${footnote.number}</span>
                    <div class="sidenote-content">${footnote.content}</div>
                `;

                const column = (index % 2 === 0) ? this.rightColumn : this.leftColumn;
                column.appendChild(sidenote);

                this.sidenotes.push({
                    element: sidenote,
                    ref: footnote.ref,
                    link: footnote.link,
                    column: column,
                    footnote: footnote.footnote
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

        bindSidenoteEvents() {
            this.sidenotes.forEach((sidenote) => {
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
            });
        },

        // === 移动端弹窗功能 ===
        setupMobilePopups() {
            // 创建弹窗容器（如果还没有）
            if (!document.querySelector('.footnote-popup-container')) {
                this.createPopupContainer();
            }

            // 为每个脚注引用绑定点击事件
            this.footnotes.forEach((footnote) => {
                footnote.link.classList.add('footnote-popup-trigger');

                // 移除旧的事件监听器
                const newLink = footnote.link.cloneNode(true);
                footnote.link.parentNode.replaceChild(newLink, footnote.link);
                footnote.link = newLink;

                // 添加新的点击事件
                footnote.link.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();

                    if (window.innerWidth < this.config.minWidthForSidenotes) {
                        if (window.innerWidth >= this.config.minWidthForPopup) {
                            // 平板：弹窗
                            this.showPopup(footnote);
                        } else {
                            // 手机：内联展开
                            this.toggleInlineFootnote(footnote);
                        }
                    }
                });
            });
        },

        createPopupContainer() {
            // 创建遮罩层
            const overlay = document.createElement('div');
            overlay.className = 'footnote-popup-overlay';
            overlay.style.display = 'none';

            // 创建弹窗
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

            // 绑定关闭事件
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay || e.target.classList.contains('footnote-popup-close')) {
                    this.closePopup();
                }
            });

            // ESC 键关闭
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

            // 设置内容
            numberEl.textContent = footnote.number;
            contentEl.innerHTML = footnote.content;

            // 显示弹窗
            overlay.style.display = 'flex';
            document.body.style.overflow = 'hidden'; // 防止背景滚动

            // 记录当前弹窗
            this.currentPopup = footnote;

            // 添加动画类
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

        // === 手机端内联展开功能 ===
        toggleInlineFootnote(footnote) {
            // 获取包含脚注引用的段落或列表项
            let container = footnote.ref.closest('p, li, div');
            if (!container) container = footnote.ref.parentElement;

            // 查找该容器内对应此脚注的内联容器
            let inlineContainer = container.querySelector(`.footnote-inline[data-footnote-id="${footnote.id}"]`);

            if (inlineContainer) {
                // 如果已存在，切换显示状态
                if (inlineContainer.style.display === 'block') {
                    // 隐藏
                    inlineContainer.style.display = 'none';
                    footnote.link.classList.remove('active');
                } else {
                    // 关闭其他所有内联脚注
                    document.querySelectorAll('.footnote-inline').forEach(el => {
                        el.style.display = 'none';
                    });
                    document.querySelectorAll('.footnote-popup-trigger.active').forEach(el => {
                        el.classList.remove('active');
                    });

                    // 显示当前脚注
                    inlineContainer.style.display = 'block';
                    footnote.link.classList.add('active');

                    // 滚动到视图中
                    setTimeout(() => {
                        inlineContainer.scrollIntoView({
                            behavior: 'smooth',
                            block: 'nearest'
                        });
                    }, 100);
                }
            } else {
                // 关闭其他所有内联脚注
                document.querySelectorAll('.footnote-inline').forEach(el => {
                    el.style.display = 'none';
                });
                document.querySelectorAll('.footnote-popup-trigger.active').forEach(el => {
                    el.classList.remove('active');
                });

                // 创建新的内联容器
                inlineContainer = document.createElement('div');
                inlineContainer.className = 'footnote-inline';
                inlineContainer.setAttribute('data-footnote-id', footnote.id);
                inlineContainer.style.display = 'block'; // 重要：设置为显示状态
                inlineContainer.innerHTML = `
            <div class="footnote-inline-number">${footnote.number}</div>
            <div class="footnote-inline-content">${footnote.content}</div>
        `;

                // 找到合适的插入位置
                // 如果引用在 sup 标签内，我们需要在 sup 的父元素后插入
                let insertAfter = footnote.ref;
                if (footnote.ref.tagName === 'SUP') {
                    insertAfter = footnote.ref;
                }

                // 插入到引用后面
                insertAfter.parentNode.insertBefore(inlineContainer, insertAfter.nextSibling);

                // 激活按钮状态
                footnote.link.classList.add('active');

                // 滚动到视图中
                setTimeout(() => {
                    inlineContainer.scrollIntoView({
                        behavior: 'smooth',
                        block: 'nearest'
                    });
                }, 100);
            }
        },

        // === 响应式处理 ===
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
                // 切换到侧注模式
                this.cleanupMobile();
                this.setupSidenotes();
            } else {
                // 切换到移动模式
                this.cleanupDesktop();
                this.setupMobilePopups();
            }
        },

        cleanupDesktop() {
            // 移除侧注栏
            document.querySelectorAll('.sidenote-column').forEach(el => el.remove());

            // 显示原始脚注
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
            // 关闭弹窗
            this.closePopup();

            // 移除内联脚注
            document.querySelectorAll('.footnote-inline').forEach(el => el.remove());

            // 移除触发器类
            document.querySelectorAll('.footnote-popup-trigger').forEach(el => {
                el.classList.remove('footnote-popup-trigger', 'active');
            });
        }
    };

    // 初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => Sidenotes.init());
    } else {
        Sidenotes.init();
    }

    window.Sidenotes = Sidenotes;
})();