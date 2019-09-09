# VVuex

翻阅 `vuex` 源码,并实现一个 `vuex`

## 全站导航

[step1 实现 state 调用](./step1/README.md)  
[step2 实现 getters 调用](./step2/README.md)  
[step3 实现 mutations 调用](./step3/README.md)

## step1 实现 state 调用

> `state` 在 vuex 内部其实就是 vue 的 data 属性,通过 vue 数据劫持特性来监控 `state`的状态

### 构建 Store 对象

```js
class Store {
    constructor(options = { state: {} }) {
        // beforeCreate 钩子挂载 $store 属性
        mixin();
        // 接受传递的 state
        let { state } = options;
        // 注册Store
        resetStoreVM(this, state);
    }
    get state() {
        // 获取_vm上的data
        return this._vm._data.$$state;
    }

    set state(v) {
        console.log('不能直接改变state');
    }
}
```

### 看看 resetStoreVM 和 mixin

```js
function resetStoreVM(store, state) {
    // 利用Vue数据劫持的原理,监听state的变化
    store._vm = new Vue({
        data: {
            $$state: state
        }
    });
}
function mixin() {
    // 在 vue created之前挂载 $store, 保证每个组件都有$store属性，也就是能访问store对象
    Vue.mixin({
        beforeCreate: function() {
            /*  this.$options 不多说了，options.store就是new实例的时候传递的那个store啦
            new Vue({
                ...
                store
            })
            */
            const options = this.$options;
            if (options.store) {
                this.$store = options.store;
            } else if (options.parent && options.parent.$store) {
                this.$store = options.parent.$store;
            }
        }
    });
}
```

### 调用

```html
<div id="app">
    <div v-for="(item, index) in $store.state.list" :key="index">
        {{ item }}
    </div>
</div>
<script type="text/javascript" src="https://unpkg.com/vue"></script>
<script src="./lib/store.js"></script>
<script>
    let store = new Store({
        state: {
            list: [1, 2, 3, 4]
        }
    });

    new Vue({
        el: '#app',
        store
    });
</script>
```

## step2 实现 getters 调用

> getter 对象,其实就是相当于`vue`的`computed`属性,获取到的是计算后的值,`store` 内部也是通过 `computed` 的方式去监听

### 创建 registerGetters 函数

用于注册 `getters` 对象

```js
// 传入 optiosn  和 store
function registerGetters(store, options) {
    // 遍历 options 上的 getters 属性
    Object.keys(options.getters || {}).forEach(key => {
        // 存储一个函数于_wrappedGetters[key]上，执行时实时传递传入 state 对象和 getters对象
        store._wrappedGetters[key] = function wrappedGetter(store) {
            // 执行 getters， 传递 state 和 getters
            return options.getters[key](store.state, store.getters);
        };
    });
}
```

### 修改 Store

```js
class Store {
    constructor(options = { state: {} }) {
        // beforeCreate 钩子挂载 $store 属性
        mixin();
        // 接受传递的 state
        let { state } = options;

        // 默认包装getters的对象
        this._wrappedGetters = Object.create(null);
        // 注册 getters
        registerGetters(this, options);

        // 注册Store
        resetStoreVM(this, state);
    }

    // get set state

    // 增加 pushList, 测试用
    set pushList(v) {
        this._vm._data.$$state.list.push(v);
    }
}
```

### 修改 resetStoreVM

```js
function resetStoreVM(store, state) {
    const wrappedGetters = store._wrappedGetters;
    const computed = {};
    // 为store挂载getter对象
    store.getters = {};
    Object.keys(wrappedGetters).forEach(key => {
        // 挂载在 computed 钩子上， 当state发生改变时，重新触发执行getters
        computed[key] = function() {
            return wrappedGetters[key](store);
        };
        Object.defineProperty(store.getters, key, {
            get: () => store._vm[key],
            enumerable: true // for local getters
        });
    });

    // 利用Vue数据劫持的原理,监听state的变化
    store._vm = new Vue({
        data: {
            $$state: state
        },
        // 挂载getters
        computed
    });
}
```

### 调用

```html
<div id="app">
    <div v-for="(item, index) in $store.state.list" :key="index">
        {{ item }}
    </div>
    length {{ $store.getters.list2 }}
</div>
<script type="text/javascript" src="https://unpkg.com/vue"></script>
<script src="./lib/store.js"></script>
<script>
    let store = new Store({
        state: {
            list: [1, 2, 3, 4]
        },
        getters: {
            list(state) {
                console.log(state);
                return state.list.length;
            },
            list2(state, getters) {
                return ': ' + getters.list;
            }
        }
    });

    new Vue({
        el: '#app',
        store,
        created() {
            setTimeout(() => {
                this.$store.state.list.push(5);
            }, 3000);
        }
    });
</script>
```

效果图如下：

![2019-09-09-15-24-11.png](http://static.qualc.cn/images/upload_e87e46497e6c783d38e65f8b00c1213e.png)

## step3 实现 mutations 调用

> `mutations`是同步修改 `store` 状态的函数,每个 `mutation` 都有一个字符串的 事件类型 (type) 和 一个 回调函数 (handler)。这个回调函数就是我们实际进行状态更改的地方，并且它会接受 state 作为第一个参数,入参为第二个可选参数`payload`,通过`this.$store.commit(type)`触发调用
> 原理很简单,实例化的时候通过`type`将`handler`存在`_mutations`属性中,`commit`时直接搜索`_mutations[key]`调用

### 创建 registerMutations 函数

用于注册 `mutations` 对象

```js
// 传入 optiosn  和 store
function registerMutations(store, options) {
    // 遍历 options 上的 mutations 属性
    Object.keys(options.mutations || {}).forEach(key => {
        let mutation = store._mutations[key] || (store._mutations[key] = []);
        // 将当前handler存入store._mutations中
        mutation.push(function wrappedMutations(payload) {
            options.mutations[key].call(store, store.state, payload);
        });
    });
}
```

### 修改 Store

```js
class Store {
    constructor(options = { state: {} }) {
        // ...

        // mutation对象
        this._mutations = Object.create(null);

        // 注册 mutations
        registerMutations(this, options);

        // 注册Store...
    }

    // ...

    // 增加 commit
    commit(type, payload) {
        if (!type) return;
        // 根据key找到对应的handler集合
        let mutations = this._mutations[type];
        // 遍历集合并执行hander
        mutations.forEach(mutationHandler => {
            mutationHandler(payload);
        });
    }
}
```

### 调用

```html
<p>mutations</p>
<div id="app">
    <div v-for="(item, index) in $store.state.list" :key="index">
        {{ item }}
    </div>
</div>
<script type="text/javascript" src="https://unpkg.com/vue"></script>
<script src="./lib/store.js"></script>
<script>
    let store = new Store({
        state: {
            list: []
        },
        mutations: {
            setList(state, payload) {
                state.list = payload;
            }
        }
    });
    new Vue({
        el: '#app',
        store,
        created() {
            this.$store.commit('setList', [1, 2, 3, 4, 5]);
        }
    });
</script>
```

效果图如下：
![2019-09-09-15-50-28.png](http://static.qualc.cn/images/upload_0d9799489a48fc050e9a30d92b49ce2b.png)

## step4 实现 actions 调用

> `actions`是异步修改 `store` 状态的函数,每个 `actions` 都有一个字符串的 事件类型 (type) 和 一个 回调函数 (handler)。这个回调函数就是我们实际进行状态更改的地方，并且它的第一个参数是包含`state`,`getters`,`dispatch`,`commit`四个属性的对象(这里只实现了 4 个),第二个参数为可选参数`payload`,通过`this.$store.dispatch(type)`触发调用
> 原理很简单同`mutations`,只不过内部处理的形式是`promise`处理方式

### 创建 registerActions 函数

用于注册 `actions` 对象

```js
// 传入 optiosn  和 store
function registerActions(store, options) {
    // 遍历 options 上的 mutations 属性
    Object.keys(options.actions || {}).forEach(key => {
        let mutation = store._actions[key] || (store._actions[key] = []);
        // 将当前handler存入store._actions中,返回的是promise对象
        mutation.push(function wrappedMutations(payload, cb) {
            // 调用并传入 dispatch commit getters state四个属性
            let res = options.actions[key].call(
                store,
                {
                    dispatch: function(type, payload) {
                        // 为了保证执行dispatch时的作用域
                        store.dispatch(type, payload);
                    },
                    commit: function(type, payload) {
                        // 同理
                        store.commit(type, payload);
                    },
                    getters: store.getters,
                    state: store.state
                },
                payload
            );
            // 如果返回的不是一个promise对象,就转换为一个promise对象
            if (!(res && typeof val.then === 'function')) {
                res = Promise.resolve(res);
            }
            return res;
        });
    });
}
```

### 修改 Store

```js
class Store {
    constructor(options = { state: {} }) {
        // ...

        // actions对象
        this._actions = Object.create(null);
        // 注册 actions
        registerActions(this, options);

        // 注册Store...
    }

    // ...

    // 增加 dispatch
    dispatch(type, payload) {
        if (!type) return;
        // 根据key找到对应的handler集合
        let actions = this._actions[type];
        // 遍历集合并执行hander,和mutations不同的是,actions是一个promise数组
        return Promise.all(actions.map(handler => handler(payload))).then(
            res => {
                // 如果只有一个handler,直接返回第一个promise对象
                return res.length > 1 ? res : res[0];
            }
        );
    }
}
```

### 调用

```html
<p>actions</p>
<div id="app">
    <div v-for="(item, index) in $store.state.list" :key="index">
        {{ item }}
    </div>
</div>
<script type="text/javascript" src="https://unpkg.com/vue"></script>
<script src="./lib/store.js"></script>
<script>
    let store = new Store({
        state: {
            list: []
        },
        mutations: {
            setList(state, payload) {
                state.list = payload;
            }
        },
        actions: {
            setList({ commit }, payload) {
                commit('setList', payload);
            }
        }
    });
    new Vue({
        el: '#app',
        store,
        created() {
            this.$store.dispatch('setList', [1, 2, 3, 4, 5]);
        }
    });
</script>
```

效果图如下：
![2019-09-09-16-34-03.png](http://static.qualc.cn/images/upload_fa6cd196715b978db77ac291db31fee5.png)

## step4 实现 modules 调用

> `modules`相当于是子模块了,通过将 store 分割成多个子模块之后更方便的操作 store,因为当所有的数据都集中在一个对象上时 store 会变的相当复杂和臃肿

### step4-1 现行的 Modules

#### 创建 Modules 和 ModuleItem 对象

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

#### 修改 Store

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

#### 第一次调用

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

### step4-2 最初的 modules (无命名空间)

#### 整合 register

##### 新建 installModules 工具函数

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

##### 修改 Store 对象

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

##### 新增 registerModules 函数

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

##### 修改 `registerMutations` 等函数

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

#### 第二次调用

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

### step4-3 为 modules 增加命名空间
