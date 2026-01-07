---
title: "Python 开发技巧分享"
date: 2026-01-07
tags: 
  - python
  - programming
  - tips
categories:
  - 技术分享
---

# Python 开发技巧分享

作为一名经常使用 Python 的开发者，我在实际项目中积累了一些实用的技巧和最佳实践。今天分享给大家。

## 🎯 项目结构最佳实践

一个清晰的项目结构能让代码更易维护：

```
my_project/
├── src/
│   ├── __init__.py
│   ├── main.py
│   └── utils/
├── tests/
│   ├── __init__.py
│   └── test_main.py
├── requirements.txt
├── README.md
└── .gitignore
```

## 💡 常用代码片段

### 1. 文件读写的优雅方式

使用上下文管理器自动处理文件关闭：

```python
# 推荐写法
with open('file.txt', 'r', encoding='utf-8') as f:
    content = f.read()
    
# 写入 JSON 数据
import json
with open('data.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)
```

### 2. 列表推导式的高效使用

```python
# 基础用法
squares = [x**2 for x in range(10)]

# 带条件过滤
even_squares = [x**2 for x in range(10) if x % 2 == 0]

# 字典推导式
word_lengths = {word: len(word) for word in ['hello', 'world', 'python']}
```

### 3. 装饰器模式

```python
import time
from functools import wraps

def timer(func):
    @wraps(func)
    def wrapper(*args, **kwargs):
        start = time.time()
        result = func(*args, **kwargs)
        end = time.time()
        print(f"{func.__name__} took {end - start:.2f} seconds")
        return result
    return wrapper

@timer
def slow_function():
    time.sleep(1)
    return "Done"
```

## 🔧 实用工具库推荐

### 数据处理
- **pandas**: 数据分析必备
- **numpy**: 科学计算基础
- **polars**: 更快的 DataFrame 处理

### Web 开发
- **FastAPI**: 现代化的 API 框架
- **requests**: HTTP 请求库
- **beautifulsoup4**: HTML 解析

### 工具类
- **pathlib**: 路径处理
- **loguru**: 更好的日志库
- **rich**: 终端美化输出

## 🚀 性能优化技巧

### 1. 使用生成器节省内存

```python
# 不好的做法 - 占用大量内存
def get_numbers(n):
    return [i for i in range(n)]

# 好的做法 - 按需生成
def get_numbers(n):
    for i in range(n):
        yield i
```

### 2. 使用 set 进行快速查找

```python
# 列表查找 O(n)
my_list = [1, 2, 3, 4, 5]
if 3 in my_list:  # 较慢
    print("Found")

# 集合查找 O(1)
my_set = {1, 2, 3, 4, 5}
if 3 in my_set:  # 更快
    print("Found")
```

## 🛡️ 错误处理

### 具体的异常处理

```python
try:
    with open('file.txt', 'r') as f:
        data = json.load(f)
except FileNotFoundError:
    print("文件不存在")
except json.JSONDecodeError:
    print("JSON 格式错误")
except Exception as e:
    print(f"未知错误: {e}")
finally:
    print("清理资源")
```

## 📝 代码风格

### 遵循 PEP 8

```python
# 命名规范
class MyClass:  # 类名用大驼峰
    pass

def my_function():  # 函数名用小写+下划线
    pass

MY_CONSTANT = 100  # 常量用大写

# 适当的空格
result = (a + b) * c  # 运算符两边加空格
my_list[0:2]  # 切片不加空格
```

## 🎨 实战案例：PDF 处理工具

我在 [PDFsplitmerger](https://github.com/Wuxy1997/PDFsplitmerger) 项目中使用了这些技巧：

```python
from PyPDF2 import PdfReader, PdfWriter
from pathlib import Path

def split_pdf(input_path, output_dir, pages_per_file=10):
    """将 PDF 文件分割成多个小文件"""
    pdf = PdfReader(input_path)
    total_pages = len(pdf.pages)
    
    output_dir = Path(output_dir)
    output_dir.mkdir(exist_ok=True)
    
    for start_page in range(0, total_pages, pages_per_file):
        writer = PdfWriter()
        end_page = min(start_page + pages_per_file, total_pages)
        
        for page_num in range(start_page, end_page):
            writer.add_page(pdf.pages[page_num])
        
        output_file = output_dir / f"split_{start_page+1}-{end_page}.pdf"
        with open(output_file, 'wb') as f:
            writer.write(f)
```

## 🔍 调试技巧

### 使用 pdb 调试

```python
import pdb

def complex_function(data):
    result = process_data(data)
    pdb.set_trace()  # 在这里设置断点
    return result
```

### 使用 logging 而不是 print

```python
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def my_function():
    logger.info("开始处理")
    logger.debug("详细信息")
    logger.error("出错了")
```

## 📚 学习资源

- **官方文档**: [python.org](https://docs.python.org/)
- **Real Python**: 高质量的 Python 教程
- **Python Weekly**: 每周 Python 资讯
- **GitHub**: 阅读优秀的开源项目代码

## 🎯 总结

Python 是一门优雅而强大的语言，掌握这些技巧能让你的代码更加：
- ✅ 可读性强
- ✅ 性能优秀
- ✅ 易于维护
- ✅ 符合规范

记住：**代码是写给人看的，只是顺便让机器执行。**

---

希望这些技巧对你有帮助！如果你有更好的建议，欢迎在评论区分享。
