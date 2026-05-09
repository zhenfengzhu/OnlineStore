// ==UserScript==
// @name         小红书采集助手 - AI 工作台
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  一键采集小红书笔记到本地 AI 工作台
// @author       Antigravity
// @match        https://www.xiaohongshu.com/explore/*
// @grant        GM_xmlhttpRequest
// @connect      localhost
// ==/UserScript==

(function() {
    'use strict';

    // 注入按钮
    const btn = document.createElement('button');
    btn.innerText = '导入到 AI 工作台';
    btn.style.position = 'fixed';
    btn.style.bottom = '20px';
    btn.style.right = '20px';
    btn.style.zIndex = '99999';
    btn.style.padding = '12px 20px';
    btn.style.backgroundColor = '#ff2442';
    btn.style.color = '#fff';
    btn.style.border = 'none';
    btn.style.borderRadius = '8px';
    btn.style.cursor = 'pointer';
    btn.style.fontWeight = 'bold';
    btn.style.boxShadow = '0 4px 12px rgba(255,36,66,0.3)';

    document.body.appendChild(btn);

    btn.onclick = function() {
        btn.innerText = '采集中...';

        try {
            // 简单选择器（根据小红书当前 DOM 结构可能需要调整，这里提供一个基础版本）
            const title = document.querySelector('#detail-title')?.innerText || '未命名笔记';
            const content = document.querySelector('#detail-desc')?.innerText || '';
            const author = document.querySelector('.username')?.innerText || '';
            
            // 互动数据
            const likes = document.querySelector('.like-wrapper .count')?.innerText || '0';
            const collects = document.querySelector('.collect-wrapper .count')?.innerText || '0';
            const comments = document.querySelector('.chat-wrapper .count')?.innerText || '0';

            // 热门评论
            const commentNodes = document.querySelectorAll('.comment-item .content');
            const hotComments = Array.from(commentNodes).slice(0, 5).map(node => node.innerText).join('\n');

            const payload = {
                title: title,
                author: author,
                content: content,
                likes: likes,
                collects: collects,
                comments: comments,
                hotComments: hotComments,
                url: window.location.href
            };

            GM_xmlhttpRequest({
                method: "POST",
                url: "http://localhost:3000/api/import",
                headers: {
                    "Content-Type": "application/json"
                },
                data: JSON.stringify(payload),
                onload: function(response) {
                    if (response.status === 200) {
                        btn.innerText = '导入成功！';
                        setTimeout(() => btn.innerText = '导入到 AI 工作台', 2000);
                    } else {
                        btn.innerText = '导入失败';
                        setTimeout(() => btn.innerText = '导入到 AI 工作台', 2000);
                    }
                },
                onerror: function() {
                    btn.innerText = '请求出错，检查本地服务';
                    setTimeout(() => btn.innerText = '导入到 AI 工作台', 2000);
                }
            });
        } catch (e) {
            btn.innerText = '解析页面失败';
            console.error(e);
            setTimeout(() => btn.innerText = '导入到 AI 工作台', 2000);
        }
    };
})();
