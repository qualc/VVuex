class Store {
    constructor(options = { state: {} }) {
        // beforeCreate 钩子挂载 $store 属性
        mixin();
        // 接受传递的 state
        let { state = {} } = options;
        // 默认包装getters的对象
        this._wrappedGetters = Object.create(null);
        // mutation对象
        this._mutations = Object.create(null);
        // actions对象
        this._actions = Object.create(null);
        // modules对象
        this._modules = new Modules(options);
        // 存放有namespace的modules
        this._modulesNamespaceMap = Object.create(null);

        // // 注册 getters
        // registerGetters(this, options);
        // // 注册 mutations
        // registerMutations(this, options);
        // // 注册 mutations
        // registerMutations(this, options);
        // // 注册 actions
        // registerActions(this, options);
        installModules(this, state, [], this._modules.root);

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
    commit(type, payload) {
        if (!type) return;
        // 根据key找到对应的handler集合
        let mutations = this._mutations[type] || [];
        // 遍历集合并执行hander
        mutations.forEach(mutationHandler => {
            mutationHandler(payload);
        });
    }
    dispatch(type, payload) {
        if (!type) return;
        // 根据key找到对应的handler集合
        let actions = this._actions[type] || [];
        // 遍历集合并执行hander,和mutations不同的是,actions是一个promise数组
        return Promise.all(actions.map(handler => handler(payload))).then(
            res => {
                // 如果只有一个handler,直接返回第一个promise对象
                return res.length > 1 ? res : res[0];
            }
        );
    }
}
function registerGetters(store, rawModules) {
    // 遍历 rawModules 上的 getters 属性
    let getters = rawModules._rawModule.getters || {};
    Object.keys(getters).forEach(key => {
        // 存储一个函数于_wrappedGetters[key]上，执行时实时传递传入 state 对象和 getters对象
        store._wrappedGetters[key] = function wrappedGetter(store) {
            // 执行 getters， 传递 state 和 getters
            return getters[key](store.state, store.getters);
        };
    });
}
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
function registerActions(store, rawModules) {
    // 遍历 rawModules 上的 mutations 属性
    let actions = rawModules._rawModule.actions || {};
    Object.keys(actions).forEach(key => {
        let mutation = store._actions[key] || (store._actions[key] = []);
        // 将当前handler存入store._actions中,返回的是promise对象
        mutation.push(function wrappedMutations(payload, cb) {
            // 调用并传入 dispatch commit getters state四个属性
            let res = actions[key].call(
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
function installModules(store, rootState, path, rawModules) {
    if (rawModules.namespaced) {
        store._modulesNamespaceMap[namespace] = rawModules;
    }
    // 不是根 state,就将rawModules挂载到state上去

    if (path.length) {
        let parentState = path.length
            ? path.slice(0, -1).reduce((state, key) => state[key], rootState)
            : rootState;
        // 这个不懂阔以看vue api  https://cn.vuejs.org/v2/api/#Vue-set
        Vue.set(parentState, path.slice(-1), rawModules.state);
    }
    // 注册 getters
    registerGetters(store, rawModules);
    // 注册 mutations
    registerMutations(store, rawModules);
    // 注册 actions
    registerActions(store, rawModules);
    // 注册 modules,
    registerModules(store, rootState, path, rawModules);
}
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
