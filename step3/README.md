# step3 实现 mutations 调用

> `mutations`是同步修改 `store` 状态的函数,每个 `mutation` 都有一个字符串的 事件类型 (type) 和 一个 回调函数 (handler)。这个回调函数就是我们实际进行状态更改的地方，并且它会接受 state 作为第一个参数,入参为第二个可选参数`payload`,通过`this.$store.commit(type)`触发调用
> 原理很简单,实例化的时候通过`type`将`handler`存在`_mutations`属性中,`commit`时直接搜索`_mutations[key]`调用

## 创建 registerMutations 函数

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

## 修改 Store

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

## 调用

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
