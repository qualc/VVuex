# step6 实现 mapXxxx 工具函数

不知道咋说,直接上代码注释

## 修改 installModule

```js
function installModules(store, rootState, path, rawModules) {
    // 获取到 namespace
    let namespace = store._modules.getNamespace(path);
    if (rawModules.namespaced) {
        // 缓存 rawModules 对象, map(工具)函数里面用得到
        store._modulesNamespaceMap[namespace] = rawModules;
    }
    // rawModules增加context 缓存 local 对象, map(工具)函数里面用得到
    const local = (rawModules.context = makeLocalContext(
        store,
        namespace,
        path
    ));
```

## 以 mapState 为例, 创建 mapState

```js
const mapState = normalizeNamespace((namespace, states) => {
    const res = {};
    normalizeMap(states).forEach(({ key, value }) => {
        // 这不能用箭头函数的原因是,当res对象结构到vue实例上之后,通过vue实例拿到$store,如果使用箭头函数,this就无法指向vue实例了
        res[key] = function mappedState() {
            let { state } = this.$store;
            if (namespace) {
                // installModules 中会缓存有命名空间的 module
                let rawModules = this.$store._modulesNamespaceMap[namespace];
                if (!rawModules) {
                    return;
                }
                // rawModules.context 是 makeLocalContext 返回的那个 local
                state = rawModules.context.state;
            }
            // 如果传入的是函数,执行函数,如果是 key 字段,直接返回值
            return typeof value === 'function'
                ? value.call(this, state)
                : state[value];
        };
    });
    return res;
});
```

## 调用

```html
<p>mapState</p>
<div id="app">
    <span>newList</span>
    <div v-for="(item, index) in newList" :key="index">
        {{ item }}
    </div>
    <p>getAge: {{ getAge }}</p>
    <p>modulesLength: {{ modulesLength }}</p>
</div>
<script type="text/javascript" src="https://unpkg.com/vue"></script>
<script src="./lib/modules.js"></script>
<script src="./lib/helper.js"></script>
<script src="./lib/store.js"></script>
<script>
    let store = new Store({
        state: {
            modulesLength: 10
        },
        modules: {
            user: {
                namespaced: true,
                state: {
                    list: [1, 2, 3, 4],
                    age: 1
                }
            }
        }
    });
    new Vue({
        el: '#app',
        store,
        computed: {
            ...mapState('user', {
                getAge: state => state.age,
                newList: 'list'
            }),
            ...mapState({
                modulesLength: 'modulesLength'
            })
        }
    });
</script>
```

效果图如下:
![2019-09-12-11-06-36.png](http://static.qualc.cn/images/upload_9c6d71aed682e82efeed55dab6757a05.png)
