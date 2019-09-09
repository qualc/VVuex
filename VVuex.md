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

`mutations`是同步修改 `store` 状态的函数,每个 `mutation` 都有一个字符串的 事件类型 (type) 和 一个 回调函数 (handler)。这个回调函数就是我们实际进行状态更改的地方，并且它会接受 state 作为第一个参数,入参为第二个可选参数`payload`,通过`this.$store.commit(type)`触发调用
原理很简单,实例化的时候通过`type`将`handler`存在`_mutations`属性中,`commit`时直接搜索`_mutations[key]`调用

### 创建 registerMutations 函数

用于注册 `getters` 对象

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
