/**
 * Markdown 编辑器类
 * 实现了一个支持实时预览、工具栏操作、自动保存和导出功能的 Markdown 编辑器
 */
class MarkdownEditor {
    /**
     * 构造函数
     * 初始化编辑器和预览区域的 DOM 引用
     */
    constructor() {
        this.editor = document.getElementById('editor');   // 文本输入区域（Markdown）
        this.preview = document.getElementById('preview'); // 预览区域（HTML 渲染）
        this.init();                                       // 初始化方法调用
    }

    /**
     * 初始化方法
     * 设置 marked 和 highlight.js 的语法高亮、绑定事件监听等
     */
    init() {
        // 设置 marked 的选项，使用 highlight.js 进行代码高亮
        marked.setOptions({
            highlight: (code) => hljs.highlightAuto(code).value
        });

        // 输入时实时更新预览内容
        this.editor.addEventListener('input', () => this.updatePreview());

        // 工具栏按钮点击事件绑定
        document.querySelectorAll('.editor-toolbar button').forEach(btn => {
            btn.addEventListener('click', (e) => this.handleToolbarClick(e));
        });

        // 自动保存草稿功能
        this.loadDraft();                           // 页面加载时尝试恢复上次保存的草稿
        setInterval(() => this.saveDraft(), 30000); // 每 30 秒自动保存一次
    }

    /**
     * 更新预览区域的内容
     * 将 Markdown 转换为 HTML 并渲染到预览区
     */
    updatePreview() {
        this.preview.innerHTML = marked.parse(this.editor.value);
        this.updateWordCount(); // 同步更新字数统计
    }

    /**
     * 处理工具栏按钮点击事件
     * 根据按钮的 data-action 属性执行对应的操作
     */
    handleToolbarClick(e) {
        const action = e.currentTarget.dataset.action; // 获取按钮的动作标识
        const editor = this.editor;
        const start = editor.selectionStart;
        const end = editor.selectionEnd;
        const selected = editor.value.slice(start, end);

        // 所有可执行的操作映射
        const actions = {
            bold: () => this.wrapText('**', '**'),                  // 加粗
            italic: () => this.wrapText('_', '_'),                  // 斜体
            link: () => this.wrapText('[', `](https://)`),          // 插入链接
            image: () => this.wrapText('[', `](image.jpg)`),        // 插入图片
            code: () => this.wrapText('\n```\n', '\n```\n'),        // 插入代码块
            save: () => this.saveDraft(),                           // 手动保存
            'export-html': () => this.exportHTML(),                 // 导出 HTML
            'export-md': () => this.exportMD(),                     // 导出 Markdown
            'header': () => this.insertHeader(),                    // 插入标题
            'ulist': () => this.wrapSelection('\n- ', ''),          // 无序列表
            'olist': () => this.wrapSelection('\n1. ', ''),         // 有序列表
            'quote': () => this.wrapText('\n> ', '\n'),             // 插入引用
            'hr': () => this.insertAtCursor('\n---\n'),             // 插入分隔线
            'table': () => this.insertTable(),                      // 插入表格
            'checklist': () => this.wrapSelection('\n- [ ] ', ''),  // 插入待办事项
            'clear': () => this.clearFormatting()                   // 清除格式
        };

        if (actions[action]) actions[action]();
    }

    /**
     * 在选中文本前后插入指定字符串
     * @param {string} before - 前缀字符串
     * @param {string} after - 后缀字符串
     */
    wrapText(before, after) {
        const editor = this.editor;
        const start = editor.selectionStart;
        const end = editor.selectionEnd;
        const text = editor.value;
        const newText = text.slice(0, start) + before + text.slice(start, end) + after + text.slice(end);

        editor.value = newText;
        editor.focus();
        editor.selectionStart = start + before.length;
        editor.selectionEnd = end + before.length;
        this.updatePreview();
    }

    /**
     * 插入标题（用户输入级别）
     */
    insertHeader() {
        const level = prompt('请输入标题级别 (1-6):', '2');
        if (level >= 1 && level <= 6) {
            this.wrapText(`${'#'.repeat(level)} `, '\n');
        }
    }

    /**
     * 插入一个示例表格
     */
    insertTable() {
        const rows = prompt('输入表格行数:', '3');
        const cols = prompt('输入表格列数:', '2');
        if (rows > 0 && cols > 0) {
            let table = '\n\n';
            // 表头
            table += '|' + ' 标题 |'.repeat(cols) + '\n';
            table += '|' + ' --- |'.repeat(cols) + '\n';
            // 表格内容
            for (let i = 0; i < rows; i++) {
                table += '|' + ' 内容 |'.repeat(cols) + '\n';
            }
            this.insertAtCursor(table);
        }
    }

    /**
     * 在光标位置插入文本
     * @param {string} text - 要插入的文本
     */
    insertAtCursor(text) {
        const start = this.editor.selectionStart;
        const end = this.editor.selectionEnd;
        this.editor.value = this.editor.value.slice(0, start) + text + this.editor.value.slice(end);
        this.editor.focus();
        this.editor.selectionStart = start + text.length;
        this.editor.selectionEnd = start + text.length;
        this.updatePreview();
    }

    /**
     * 对选中的多行文本进行包裹处理
     * @param {string} before - 每行前加的内容
     * @param {string} after - 每行后加的内容
     */
    wrapSelection(before, after = '') {
        const editor = this.editor;
        const start = editor.selectionStart;
        const end = editor.selectionEnd;
        const selected = editor.value.slice(start, end);

        // 处理多行文本
        const modified = selected.split('\n')
            .map(line => before + line + after)
            .join('\n');

        // 计算新的光标位置
        const newText = editor.value.slice(0, start) + modified + editor.value.slice(end);
        const newEnd = start + modified.length;

        editor.value = newText;
        editor.focus();
        editor.selectionStart = start;
        editor.selectionEnd = newEnd;
        this.updatePreview();
    }

    /**
     * 清除选中文本的格式（如加粗、斜体）
     */
    clearFormatting() {
        const start = this.editor.selectionStart;
        const end = this.editor.selectionEnd;
        const selected = this.editor.value.slice(start, end);
        const cleanText = selected
            .replace(/(\*\*|__)(.*?)\1/g, '$2')  // 清除加粗
            .replace(/(\*|_)(.*?)\1/g, '$2');    // 清除斜体

        this.editor.value = this.editor.value.slice(0, start) + cleanText + this.editor.value.slice(end);
        this.editor.selectionStart = start;
        this.editor.selectionEnd = start + cleanText.length;
        this.updatePreview();
    }

    /**
     * 保存当前内容为本地草稿
     */
    saveDraft() {
        localStorage.setItem('editorDraft', this.editor.value);
        document.getElementById('lastsave').textContent =
            `最后保存：${new Date().toLocaleTimeString()}`;
    }

    /**
     * 加载之前保存的草稿
     */
    loadDraft() {
        const draft = localStorage.getItem('editorDraft');
        if (draft) {
            this.editor.value = draft;
            this.updatePreview();
        }
    }

    /**
     * 导出为 HTML 文件
     */
    exportHTML() {
        const blob = new Blob([this.preview.innerHTML], { type: 'text/html' });
        this.downloadFile(blob, 'document.html');
    }

    /**
     * 导出为 Markdown 文件
     */
    exportMD() {
        const blob = new Blob([this.editor.value], { type: 'text/markdown' });
        this.downloadFile(blob, 'document.md');
    }

    /**
     * 下载文件
     * @param {Blob} blob - 要下载的文件内容
     * @param {string} filename - 文件名
     */
    downloadFile(blob, filename) {
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        link.click();
    }

    /**
     * 更新字数统计
     */
    updateWordCount() {
        const count = this.editor.value.length;
        document.getElementById('wordcount').textContent = `字数：${count}`;
    }
}

// 页面加载完成后初始化编辑器
window.addEventListener('DOMContentLoaded', () => new MarkdownEditor());