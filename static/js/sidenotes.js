// Sidenotes for Hugo Bear Blog with ox-hugo support
(function() {
    'use strict';
    
    const Sidenotes = {
        // 配置
        config: {
            minWidth: 1400,  // 最小屏幕宽度（适配 Bear Blog 的布局）
            sidenoteWidth: 240,  // 侧注宽度
            marginTop: 20,  // 顶部边距
            spacing: 30,  // 侧注之间的间距
            maxSidenotesPerSide: 30  // 每边最多显示的侧注数
        },
        
        // 初始化
        init() {
            // 延迟执行，确保 DOM 完全加载
            setTimeout(() => {
                this.setupSidenotes();
            }, 100);
        },
        
        setupSidenotes() {
            // 检查是否应该显示侧注
            if (window.innerWidth < this.config.minWidth) {
                this.disableSidenotes();
                return;
            }
            
            this.container = document.querySelector('main content, main, article, body');
            this.footnotes = this.collectFootnotes();
            
            if (this.footnotes.length === 0) return;
            
            this.createSidenoteColumns();
            this.convertFootnotesToSidenotes();
            this.positionSidenotes();
            this.bindEvents();
        },
        
        // 收集所有脚注
        collectFootnotes() {
            const footnotes = [];
            
            // Hugo 默认格式
            const hugoRefs = document.querySelectorAll('sup[id^="fnref"] a[href^="#fn"]');
            hugoRefs.forEach(ref => {
                const id = ref.getAttribute('href').replace('#fn:', '').replace('#fn', '');
                const footnoteElement = document.querySelector(`#fn\\:${id}, #fn${id}`);
                
                if (footnoteElement) {
                    // 获取脚注内容，移除返回链接
                    let content = footnoteElement.innerHTML;
                    content = content.replace(/<a[^>]*href="#fnref[^"]*"[^>]*>.*?<\/a>/gi, '');
                    content = content.replace(/↩︎/g, '');
                    
                    footnotes.push({
                        id: id,
                        ref: ref.parentElement,  // sup 元素
                        link: ref,
                        footnote: footnoteElement,
                        content: content.trim()
                    });
                }
            });
            
            // ox-hugo 格式（如果使用）
            const oxhugoRefs = document.querySelectorAll('.footnote-ref');
            oxhugoRefs.forEach(ref => {
                const id = ref.getAttribute('href').replace('#fn.', '').replace('#fn:', '');
                const footnoteElement = document.querySelector(`.footdef#fn\\.${id}, #fn\\:${id}`);
                
                if (footnoteElement && !footnotes.find(f => f.id === id)) {
                    let content = footnoteElement.querySelector('.footpara')?.innerHTML 
                                || footnoteElement.innerHTML;
                    content = content.replace(/<a[^>]*class="footnum"[^>]*>.*?<\/a>/gi, '');
                    
                    footnotes.push({
                        id: id,
                        ref: ref,
                        link: ref,
                        footnote: footnoteElement,
                        content: content.trim()
                    });
                }
            });
            
            return footnotes;
        },
        
        // 创建侧注栏
        createSidenoteColumns() {
            // 移除已存在的栏
            document.querySelectorAll('.sidenote-column').forEach(el => el.remove());
            
            // 创建左右两栏
            this.leftColumn = document.createElement('div');
            this.leftColumn.className = 'sidenote-column sidenote-column-left';
            
            this.rightColumn = document.createElement('div');
            this.rightColumn.className = 'sidenote-column sidenote-column-right';
            
            document.body.appendChild(this.leftColumn);
            document.body.appendChild(this.rightColumn);
        },
        
        // 转换脚注为侧注
        convertFootnotesToSidenotes() {
            this.sidenotes = [];
            
            this.footnotes.forEach((footnote, index) => {
                // 创建侧注元素
                const sidenote = document.createElement('div');
                sidenote.className = 'sidenote';
                sidenote.id = `sidenote-${footnote.id}`;
                sidenote.innerHTML = `
                    <span class="sidenote-number">${index + 1}</span>
                    <div class="sidenote-content">${footnote.content}</div>
                `;
                
                // 决定放在左栏还是右栏（交替放置）
                const column = (index % 2 === 0) ? this.rightColumn : this.leftColumn;
                column.appendChild(sidenote);
                
                this.sidenotes.push({
                    element: sidenote,
                    ref: footnote.ref,
                    link: footnote.link,
                    column: column,
                    footnote: footnote.footnote
                });
                
                // 隐藏原始脚注
                if (footnote.footnote) {
                    footnote.footnote.style.display = 'none';
                }
                
                // 修改引用样式
                footnote.link.classList.add('sidenote-ref');
                footnote.link.setAttribute('data-sidenote-id', footnote.id);
                
                // 阻止默认点击行为
                footnote.link.addEventListener('click', (e) => {
                    if (window.innerWidth >= this.config.minWidth) {
                        e.preventDefault();
                        // 可选：点击时滚动到侧注
                        sidenote.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        sidenote.classList.add('highlighted');
                        setTimeout(() => {
                            sidenote.classList.remove('highlighted');
                        }, 2000);
                    }
                });
            });
            
            // 隐藏原始脚注区域
            const footnoteSection = document.querySelector('.footnotes, #footnotes, .footdefs');
            if (footnoteSection) {
                footnoteSection.style.display = 'none';
            }
        },
        
        // 定位侧注
        positionSidenotes() {
            let lastLeftBottom = 0;
            let lastRightBottom = 0;
            
            this.sidenotes.forEach((sidenote) => {
                const ref = sidenote.ref;
                const refRect = ref.getBoundingClientRect();
                const refTop = refRect.top + window.scrollY;
                
                // 确定理想位置
                let idealTop = refTop - this.config.marginTop;
                
                // 避免重叠
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
        
        // 绑定事件
        bindEvents() {
            // 窗口大小改变时重新定位
            let resizeTimer;
            window.addEventListener('resize', () => {
                clearTimeout(resizeTimer);
                resizeTimer = setTimeout(() => {
                    if (window.innerWidth < this.config.minWidth) {
                        this.disableSidenotes();
                    } else {
                        this.setupSidenotes();
                    }
                }, 250);
            });
            
            // 悬停效果
            this.sidenotes.forEach((sidenote) => {
                // 悬停引用时高亮侧注
                sidenote.ref.addEventListener('mouseenter', () => {
                    sidenote.element.classList.add('highlighted');
                });
                sidenote.ref.addEventListener('mouseleave', () => {
                    sidenote.element.classList.remove('highlighted');
                });
                
                // 悬停侧注时高亮引用
                sidenote.element.addEventListener('mouseenter', () => {
                    sidenote.link.classList.add('highlighted');
                });
                sidenote.element.addEventListener('mouseleave', () => {
                    sidenote.link.classList.remove('highlighted');
                });
            });
            
            // 页面滚动时可能需要重新定位（如果有动态内容）
            let scrollTimer;
            window.addEventListener('scroll', () => {
                clearTimeout(scrollTimer);
                scrollTimer = setTimeout(() => {
                    if (window.innerWidth >= this.config.minWidth) {
                        this.positionSidenotes();
                    }
                }, 100);
            });
        },
        
        // 禁用侧注（小屏幕）
        disableSidenotes() {
            // 移除侧注栏
            document.querySelectorAll('.sidenote-column').forEach(el => el.remove());
            
            // 显示原始脚注
            this.footnotes?.forEach(footnote => {
                if (footnote.footnote) {
                    footnote.footnote.style.display = '';
                }
                if (footnote.link) {
                    footnote.link.classList.remove('sidenote-ref', 'highlighted');
                }
            });
            
            // 显示脚注区域
            const footnoteSection = document.querySelector('.footnotes, #footnotes, .footdefs');
            if (footnoteSection) {
                footnoteSection.style.display = '';
            }
        }
    };
    
    // 页面加载完成后初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => Sidenotes.init());
    } else {
        Sidenotes.init();
    }
    
    // 导出到全局
    window.Sidenotes = Sidenotes;
})();