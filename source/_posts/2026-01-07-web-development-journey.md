---
title: "从零开始的 Web 开发之旅"
date: 2026-01-07
tags: 
  - web开发
  - typescript
  - vue
  - javascript
categories:
  - 技术教程
---

# 从零开始的 Web 开发之旅

作为一名开发者，我在 Web 开发领域积累了不少经验。从 TypeScript 到 Vue.js，从前端到全栈，今天分享一些实战经验。

## 🎯 技术栈选择

在我的项目中，我主要使用以下技术栈：

### 前端框架
- **Vue.js**: 渐进式框架，易学易用
- **TypeScript**: 类型安全的 JavaScript
- **Vite**: 极速的构建工具

### 项目实例
- [Com6102gp5](https://github.com/Wuxy1997/Com6102gp5) - TypeScript 项目
- [6102](https://github.com/Wuxy1997/6102) - Vue.js 应用

## 🚀 TypeScript：JavaScript 的超集

### 为什么选择 TypeScript？

```typescript
// JavaScript - 运行时才发现错误
function add(a, b) {
    return a + b;
}
add(1, "2");  // "12" - 意外的字符串拼接！

// TypeScript - 编译时就能发现问题
function add(a: number, b: number): number {
    return a + b;
}
add(1, "2");  // 编译错误：类型不匹配
```

### 接口与类型

```typescript
// 定义接口
interface User {
    id: number;
    name: string;
    email: string;
    role?: 'admin' | 'user';  // 可选属性
}

// 使用接口
function getUser(id: number): User {
    return {
        id,
        name: "大木头WU",
        email: "user@example.com",
        role: "admin"
    };
}

// 类型别名
type Point = {
    x: number;
    y: number;
};

// 联合类型
type Status = 'pending' | 'success' | 'error';
```

### 泛型的威力

```typescript
// 泛型函数
function firstElement<T>(arr: T[]): T | undefined {
    return arr[0];
}

const numbers = [1, 2, 3];
const first = firstElement(numbers);  // 类型: number | undefined

// 泛型类
class DataStore<T> {
    private data: T[] = [];
    
    add(item: T): void {
        this.data.push(item);
    }
    
    getAll(): T[] {
        return this.data;
    }
}

const userStore = new DataStore<User>();
userStore.add({ id: 1, name: "Alice", email: "alice@example.com" });
```

## 🎨 Vue.js 开发实践

### 组合式 API (Composition API)

```vue
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';

// 响应式状态
const count = ref(0);
const name = ref('大木头WU');

// 计算属性
const doubleCount = computed(() => count.value * 2);

// 方法
const increment = () => {
    count.value++;
};

// 生命周期钩子
onMounted(() => {
    console.log('组件已挂载');
});
</script>

<template>
    <div class="container">
        <h1>Hello, {{ name }}</h1>
        <p>Count: {{ count }}</p>
        <p>Double: {{ doubleCount }}</p>
        <button @click="increment">增加</button>
    </div>
</template>

<style scoped>
.container {
    padding: 20px;
}
</style>
```

### 自定义 Hooks

```typescript
// useCounter.ts
import { ref, computed } from 'vue';

export function useCounter(initialValue = 0) {
    const count = ref(initialValue);
    
    const increment = () => count.value++;
    const decrement = () => count.value--;
    const reset = () => count.value = initialValue;
    
    const isPositive = computed(() => count.value > 0);
    
    return {
        count,
        increment,
        decrement,
        reset,
        isPositive
    };
}

// 在组件中使用
import { useCounter } from './useCounter';

const { count, increment, decrement, isPositive } = useCounter(10);
```

### 状态管理 - Pinia

```typescript
// stores/user.ts
import { defineStore } from 'pinia';

export const useUserStore = defineStore('user', {
    state: () => ({
        currentUser: null as User | null,
        isLoggedIn: false
    }),
    
    getters: {
        userName: (state) => state.currentUser?.name ?? 'Guest',
        isAdmin: (state) => state.currentUser?.role === 'admin'
    },
    
    actions: {
        async login(email: string, password: string) {
            try {
                const user = await api.login(email, password);
                this.currentUser = user;
                this.isLoggedIn = true;
            } catch (error) {
                console.error('登录失败', error);
            }
        },
        
        logout() {
            this.currentUser = null;
            this.isLoggedIn = false;
        }
    }
});
```

## 🛠️ 开发工具配置

### Vite 配置

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import path from 'path';

export default defineConfig({
    plugins: [vue()],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src')
        }
    },
    server: {
        port: 3000,
        open: true,
        proxy: {
            '/api': {
                target: 'http://localhost:8080',
                changeOrigin: true,
                rewrite: (path) => path.replace(/^\/api/, '')
            }
        }
    }
});
```

### TypeScript 配置

```json
{
    "compilerOptions": {
        "target": "ES2020",
        "module": "ESNext",
        "lib": ["ES2020", "DOM", "DOM.Iterable"],
        "jsx": "preserve",
        "strict": true,
        "moduleResolution": "node",
        "resolveJsonModule": true,
        "esModuleInterop": true,
        "skipLibCheck": true,
        "baseUrl": ".",
        "paths": {
            "@/*": ["src/*"]
        }
    },
    "include": ["src/**/*.ts", "src/**/*.vue"],
    "exclude": ["node_modules"]
}
```

## 🎯 最佳实践

### 1. 组件设计原则

```vue
<!-- Bad - 组件做太多事 -->
<template>
    <div>
        <input v-model="searchTerm" />
        <div v-for="item in filteredItems">...</div>
        <button @click="saveData">保存</button>
    </div>
</template>

<!-- Good - 单一职责 -->
<template>
    <div>
        <SearchInput v-model="searchTerm" />
        <ItemList :items="filteredItems" />
        <SaveButton @click="handleSave" />
    </div>
</template>
```

### 2. Props 类型定义

```typescript
// 使用 TypeScript 定义 Props
interface Props {
    title: string;
    count?: number;
    items: Item[];
    onUpdate: (id: number) => void;
}

// 或使用 defineProps with 泛型
const props = defineProps<Props>();

// 带默认值
const props = withDefaults(defineProps<Props>(), {
    count: 0
});
```

### 3. 错误处理

```typescript
// 全局错误处理
app.config.errorHandler = (err, instance, info) => {
    console.error('全局错误:', err);
    // 上报到错误追踪系统
    errorTracker.report(err);
};

// 组件内错误处理
import { onErrorCaptured } from 'vue';

onErrorCaptured((err, instance, info) => {
    console.error('捕获到错误:', err);
    return false;  // 阻止错误继续传播
});
```

## 🧪 测试

### 单元测试

```typescript
import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import Counter from './Counter.vue';

describe('Counter', () => {
    it('增加计数', async () => {
        const wrapper = mount(Counter);
        
        await wrapper.find('button').trigger('click');
        
        expect(wrapper.find('.count').text()).toBe('1');
    });
    
    it('显示正确的 props', () => {
        const wrapper = mount(Counter, {
            props: { initialCount: 10 }
        });
        
        expect(wrapper.find('.count').text()).toBe('10');
    });
});
```

## 🚢 部署

### 构建优化

```typescript
// vite.config.ts
export default defineConfig({
    build: {
        rollupOptions: {
            output: {
                manualChunks: {
                    'vendor': ['vue', 'vue-router', 'pinia'],
                    'ui': ['element-plus']
                }
            }
        },
        chunkSizeWarningLimit: 1000
    }
});
```

### 环境变量

```bash
# .env.development
VITE_API_URL=http://localhost:8080/api
VITE_APP_TITLE=开发环境

# .env.production
VITE_API_URL=https://api.example.com
VITE_APP_TITLE=生产环境
```

```typescript
// 使用环境变量
const apiUrl = import.meta.env.VITE_API_URL;
```

## 📱 响应式设计

```css
/* 移动优先 */
.container {
    padding: 1rem;
}

/* 平板 */
@media (min-width: 768px) {
    .container {
        padding: 2rem;
    }
}

/* 桌面 */
@media (min-width: 1024px) {
    .container {
        max-width: 1200px;
        margin: 0 auto;
        padding: 3rem;
    }
}
```

## 🎓 学习资源

- **Vue 3 官方文档**: 最权威的学习资料
- **TypeScript Handbook**: 深入理解 TypeScript
- **Vite 文档**: 了解现代构建工具
- **Vue Mastery**: 高质量的视频课程

## 💡 项目展示

查看我的实际项目：
- [Com6102gp5](https://github.com/Wuxy1997/Com6102gp5) - TypeScript 全栈项目
- [6102](https://github.com/Wuxy1997/6102) - Vue.js 单页应用

## 🎯 总结

Web 开发是一个快速发展的领域，保持学习的态度很重要：

✅ 掌握基础：HTML, CSS, JavaScript
✅ 拥抱新工具：TypeScript, Vue 3, Vite
✅ 重视实践：多做项目，多写代码
✅ 关注社区：跟上最新技术趋势

---

希望这篇文章能帮助你在 Web 开发之路上走得更远！

欢迎在评论区分享你的经验和问题 💬
