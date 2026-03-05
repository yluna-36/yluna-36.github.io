import os
import re
import shutil
from datetime import datetime
from urllib.parse import unquote

# 1. 实验室路径配置
INPUT_DIR = r"D:\my_professional_site\Private & Shared\人格塑造" # 你的 Notion 解压目录
OUTPUT_DIR = r"D:\my_professional_site\source\_posts"          # Hexo 的文章存放目录

# 2. 核心探测器：匹配 Notion 生成的 32 位 UUID 乱码
# 比如 "心理 172d557df51b80e78.md" 里面的那一长串
UUID_PATTERN = re.compile(r'\s*[a-fA-F0-9]{32}')

def clean_name(name):
    """剔除文件名或链接中的 UUID，还原纯净名字"""
    name = unquote(name) # 处理 URL 编码的空格 (%20)
    cleaned = re.sub(UUID_PATTERN, '', name)
    return cleaned

def process_notion_export():
    if not os.path.exists(OUTPUT_DIR):
        os.makedirs(OUTPUT_DIR)

    # 遍历所有解压出来的文件
    for root, dirs, files in os.walk(INPUT_DIR):
        for file in files:
            if file.endswith('.md'):
                original_md_path = os.path.join(root, file)
                
                # 提取纯净文件名，例如 "心理"
                base_name = os.path.splitext(file)[0]
                pure_name = clean_name(base_name)
                
                target_md_path = os.path.join(OUTPUT_DIR, f"{pure_name}.md")
                target_asset_folder = os.path.join(OUTPUT_DIR, pure_name)
                
                # 创建与文章同名的图片资源文件夹 (Hexo post_asset_folder 规范)
                if not os.path.exists(target_asset_folder):
                    os.makedirs(target_asset_folder)

                with open(original_md_path, 'r', encoding='utf-8') as f:
                    content = f.read()

                # 3. 拦截并修改 Markdown 内部链接和图片引用
                def link_replacer(match):
                    full_match = match.group(0)
                    link_url = match.group(2)
                    
                    pure_url = clean_name(link_url)
                    
                    # 如果是本地图片，顺手把它搬运到 Hexo 的资源文件夹里
                    if full_match.startswith('!') and not pure_url.startswith('http'):
                        img_source_path = os.path.join(root, unquote(link_url))
                        if os.path.exists(img_source_path):
                            img_filename = os.path.basename(pure_url)
                            shutil.copy2(img_source_path, os.path.join(target_asset_folder, img_filename))
                            pure_url = img_filename # Hexo 规范：只需写图片名即可
                    
                    return full_match.replace(link_url, pure_url)

                content = re.sub(r'!?\[([^\]]*)\]\(([^)]+)\)', link_replacer, content)

                # 4. 注入灵魂：Hexo 的 Front-matter 头部
                category_name = os.path.basename(root)
                if category_name == os.path.basename(INPUT_DIR):
                    category_name = "个人记录" # 主目录默认分类
                
                current_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                front_matter = f"""---
title: {pure_name}
date: {current_time}
categories:
  - {category_name}
---

"""
                final_content = front_matter + content

                # 输出改造后的文件
                with open(target_md_path, 'w', encoding='utf-8') as f:
                    f.write(final_content)
                print(f"✅ 成功转化: {pure_name}")

if __name__ == "__main__":
    print("🚀 开始执行 Notion 到 Hexo 的格式转换...")
    process_notion_export()
    print("🎉 转换完成！")