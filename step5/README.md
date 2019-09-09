# step4 实现 modules 调用

> `modules`相当于是子模块了,通过将 store 分割成多个子模块之后更方便的操作 store,因为当所有的数据都集中在一个对象上时 store 会变的相当复杂和臃肿

## step4-1 现行的 Modules

### 创建 Modules 和 ModuleItem 对象

首先需要创建 `Modules` 和 `ModuleItem` 两个对象来管理 `modules` 的依赖, `Modules`是一个`树`的存在,囊括所有的 `module`,`ModuleItem`是每一个 `modules` 的信息存储对象

先来个简单的例子

```js
class ModuleItem {
    constructor(rawModule) {
        // 创建子 module 列表
        this._children = Object.create(null);
        // module 对象
        this._rawModule = rawModule;
        // 子 module 的 state
        this.state = rawModule.state || {};
    }
    // 添加子modules
    addChild(key, moduleItem) {
        this._children[key] = moduleItem;
    }
}

class Modules {
    constructor(rawModule) {
        this.register([], rawModule);
    }
    // 注册
    register(path, rawModule) {
        let newModule = new ModuleItem(rawModule);
        // 这里表示,如果namespace也就是path是空的话,是根modules
        if (path.length == 0) {
            this.root = newModule;
        } else {
            // 获取到他的前一级父元素,
            const parent = this.get(path.slice(0, -1));
            parent.addChild(path[path.length - 1], newModule);
        }
        // 如果配置有 modules 属性,递归注册
        if (rawModule.modules) {
            Object.keys(rawModule.modules).forEach(key => {
                // concat一个新数组
                this.register(path.concat(key), rawModule.modules[key]);
            });
        }
    }
    get(path) {
        // 直接拔的vuex的源码, 活到老学到老系列~~~
        // 这行代码的大概意思就是从root对象中,循环获取指定的key的属性
        // ['a', 'b'].reduce( (module, key) => module[key], {a: {b: 123} }); 执行一下试试
        return path.reduce((module, key) => {
            return module.getChild(key);
        }, this.root);
    }
}
```

### 修改 Store

```js
class Store {
    constructor(options = { state: {} }) {
        // ...

        this._modules = new Modules(options);
        console.log(this._modules);

        // 注册Store...
    }
}
```

### 第一次调用

```html
<script type="text/javascript" src="https://unpkg.com/vue"></script>
<script src="./lib/modules.js"></script>
<script src="./lib/store.js"></script>
<script>
    let store = new Store({
        state: {
            list: []
        },
        modules: {
            user: {
                state: {
                    list: 1
                }
            }
        }
    });
    new Vue({
        el: '#app',
        store,
        created() {}
    });
</script>
```

输出结果
![2019-09-09-17-16-45.png](http://static.qualc.cn/images/upload_c5e185d4639e570c9152b5399c2c50b4.png)

## step4-2 最初的 modules (无命名空间)

### 整合 register

#### 新建 installModules 工具函数

```js
function installModules(store, rootState, path, rawModules) {
    // 不是根 state,就将rawModules挂载到state上去
    if (path.length) {
        let parentState = path.length
            ? path.slice(0, -1).reduce((state, key) => state[key], rootState)
            : rootState;
        // 这个不懂阔以看vue api  https://cn.vuejs.org/v2/api/#Vue-set
        Vue.set(parentState, path.slice(-1), rawModules.state);
    }
    // 因为用了Modules模块,所以 options 入参改为 rawModules
    // 注册 getters
    registerGetters(store, rawModules);
    // 注册 mutations
    registerMutations(store, rawModules);
    // 注册 actions
    registerActions(store, rawModules);
    // 注册 modules,
    registerModules(store, rootState, path, rawModules);
}
```

#### 修改 Store 对象

```js
class Store {
    constructor(options = { state: {} }) {
        // ...

        // // 注册 getters
        // registerGetters(this, options);
        // // 注册 mutations
        // registerMutations(this, options);
        // // 注册 mutations
        // registerMutations(this, options);
        // // 注册 actions
        // registerActions(this, options);
        installModules(this, state, [], this._modules.root);

        // 注册Store...
    }
}
```

#### 新增 registerModules 函数

用来递归注册子 modules 模块

```js
function registerModules(store, rootState, path, rawModules) {
    // 遍历 rawModules 上的 modules 属性
    // 递归注册modules
    Object.keys(rawModules._children || {}).forEach(key => {
        installModules(
            store,
            rootState,
            path.concat(key),
            rawModules._children[key]
        );
    });
}
```

#### 修改 `registerMutations` 等函数

因为入参从 options 改为了 rawModules, 所以内部做了一点处理(获取属性对象的方式发生变化)

```js
function registerMutations(store, rawModules) {
    // 遍历 rawModules 上的 mutations 属性
    let mutations = rawModules._rawModule.mutations || {};
    Object.keys(mutations).forEach(key => {
        let mutation = store._mutations[key] || (store._mutations[key] = []);
        // 将当前handler存入store._mutations中
        mutation.push(function wrappedMutations(payload) {
            mutations[key].call(store, store.state, payload);
        });
    });
}
```

`registerGetters` 和 `registerActions`同理

### 第二次调用

```html
<p>modules noNamespace</p>
<div id="app">
    <div v-for="(item, index) in $store.state.list" :key="index">
        {{ item }}
    </div>
</div>
<script type="text/javascript" src="https://unpkg.com/vue"></script>
<script src="./lib/modules.js"></script>
<script src="./lib/store.js"></script>
<script>
    let store = new Store({
        modules: {
            // 没有命名空间
            user: {
                state: {
                    list: []
                },
                mutations: {
                    setList(state, paylod) {
                        console.log(state);
                        state.list = paylod;
                    }
                }
            }
        }
    });
    new Vue({
        el: '#app',
        store,
        created() {
            // 没有命名空间, 所以直接调用
            this.$store.commit('setList', [1, 2, 3, 4]);
        }
    });
</script>
```

效果图如下：
![2019-09-09-18-44-31.png](http://static.qualc.cn/images/upload_6dcf662e618e3dc7a01e728cdbf74541.png)

## step4-3 为 modules 增加命名空间
