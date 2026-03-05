import os
from pathlib import Path

ROOT = Path(__file__).resolve().parent
POSTS_ROOT = ROOT / "source" / "_posts"

def remove_brackets(name: str) -> str:
    return name.replace("[", "").replace("]", "")

def rename_dirs_and_files():
    """
    先处理目录名，再处理文件名。
    对于含 [ 或 ] 的名字，只删除这两个字符。
    """
    if not POSTS_ROOT.exists():
        print(f"{POSTS_ROOT} 不存在，检查路径是否正确。")
        return

    # 先处理目录（topdown=True 方便在遍历时修改 dirs）
    for current_root, dirs, files in os.walk(POSTS_ROOT, topdown=True):
        # 处理子目录
        for i, d in enumerate(dirs):
            if "[" in d or "]" in d:
                old_path = Path(current_root) / d
                new_name = remove_brackets(d)
                new_path = Path(current_root) / new_name
                # 避免重名覆盖
                if new_path.exists():
                    print(f"目录重名，跳过：{old_path} -> {new_path}")
                    continue
                print(f"重命名目录：{old_path} -> {new_path}")
                os.rename(old_path, new_path)
                dirs[i] = new_name  # 更新 dirs，保证后续 os.walk 能继续深入新目录

        # 处理当前目录下的文件
        for f in files:
            if not f.lower().endswith(".md"):
                continue
            if "[" in f or "]" in f:
                old_path = Path(current_root) / f
                new_name = remove_brackets(f)
                new_path = Path(current_root) / new_name
                if new_path.exists():
                    print(f"文件重名，跳过：{old_path} -> {new_path}")
                    continue
                print(f"重命名文件：{old_path} -> {new_path}")
                os.rename(old_path, new_path)

def fix_title_line_in_md():
    """
    遍历所有 .md 文件：
    如果第一行形如：title: [xxx...
    则改为：title: "[xxx..."
    （即把 title: 后面的整段内容用英文双引号包起来）
    """
    if not POSTS_ROOT.exists():
        return

    for path in POSTS_ROOT.rglob("*.md"):
        try:
            # 读文件
            try:
                text = path.read_text(encoding="utf-8-sig")
                encoding = "utf-8-sig"
            except UnicodeDecodeError:
                text = path.read_text(encoding="utf-8")
                encoding = "utf-8"

            lines = text.splitlines(keepends=True)
            if not lines:
                continue

            first_line = lines[0]
            stripped = first_line.lstrip()
            indent = first_line[:len(first_line) - len(stripped)]

            if stripped.startswith("title:"):
                after_title = stripped[len("title:"):]

                # 去掉左侧空白，方便判断是否紧跟 '['
                after_title_strip_left = after_title.lstrip()
                if after_title_strip_left.startswith("["):
                    # 保留原有 title: 之后的内容，但整体用双引号包起来
                    # 原内容（含可能的空格和 [ ]）：
                    raw_value = after_title.rstrip("\r\n")
                    # 构造新行
                    new_value = f' "{raw_value.strip()}"'
                    new_first_line = indent + "title:" + new_value + "\n"
                    if first_line != new_first_line:
                        print(f"修复标题：{path}")
                        lines[0] = new_first_line

                        new_text = "".join(lines)
                        path.write_text(new_text, encoding=encoding)

        except Exception as e:
            print(f"处理文件出错：{path} -> {e}")

def main():
    print("开始重命名目录和文件（移除 [ ]）...")
    rename_dirs_and_files()
    print("开始修复 .md 文件第一行的 title...")
    fix_title_line_in_md()
    print("处理完成。")

if __name__ == "__main__":
    main()