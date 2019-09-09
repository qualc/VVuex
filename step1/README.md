# step1 实现 state 调用

> `state` 在 vuex 内部其实就是 vue 的 data 属性,通过 vue 数据劫持特性来监控 `state`的状态

## 构建 Store 对象

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

## 看看 resetStoreVM 和 mixin

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

## 调用

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
