# step4 实现 actions 调用

> `actions`是异步修改 `store` 状态的函数,每个 `actions` 都有一个字符串的 事件类型 (type) 和 一个 回调函数 (handler)。这个回调函数就是我们实际进行状态更改的地方，并且它的第一个参数是包含`state`,`getters`,`dispatch`,`commit`四个属性的对象(这里只实现了 4 个),第二个参数为可选参数`payload`,通过`this.$store.dispatch(type)`触发调用
> 原理很简单同`mutations`,只不过内部处理的形式是`promise`处理方式

## 创建 registerActions 函数

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

## 修改 Store

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

## 调用

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
