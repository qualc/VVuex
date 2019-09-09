# step2 实现 getters 调用

> getter 对象,其实就是相当于`vue`的`computed`属性,获取到的是计算后的值,`store` 内部也是通过 `computed` 的方式去监听

## 创建 registerGetters 函数

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

## 修改 Store

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

## 修改 resetStoreVM

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

## 调用

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
