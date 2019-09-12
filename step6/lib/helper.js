// 介只是一个统一处理 namespace的地方
function normalizeNamespace(fn) {
    return (namespace, map) => {
        if (typeof namespace !== 'string') {
            map = namespace;
            namespace = '';
        } else if (namespace.charAt(namespace.length - 1) !== '/') {
            namespace += '/';
        }
        return fn(namespace, map);
    };
}
// 介 是兼容入参格式的地方,是数组还是对象,最终都转为[{key:xx, value: xx}]格式
function normalizeMap(map) {
    return Array.isArray(map)
        ? map.map(key => ({ key, value: key }))
        : Object.keys(map).map(key => ({ key, value: map[key] }));
}

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

const mapMutations = normalizeNamespace((namespace, states) => {
    let res = {};
    normalizeMap(states).forEach(({ key, value }) => {
        // this.$commit.xxx(arg1, arg2); 是有参数的
        res[key] = function mappedMutations(...args) {
            // 操作都类型,区别在于取的值
            let { commit } = this.$store;
            if (namespace) {
                let rawModules = this.$store._modulesNamespaceMap[namespace];
                if (!rawModules) {
                    return;
                }
                commit = rawModules.context.commit;
            }
            // 如果传入的是函数,传递参数并执行函数,如果是 key 字段,直接执行
            return typeof value === 'function'
                ? value.apply(this, [commit].concat(args))
                : commit.call(this.$store, value, ...args);
        };
    });
    return res;
});

// 和楼上一样一样的
const mapActions = normalizeNamespace((namespace, states) => {
    let res = {};
    normalizeMap(states).forEach(({ key, value }) => {
        // this.$commit.xxx(arg1, arg2); 是有参数的
        res[key] = function mappedActions(...args) {
            // 操作都类型,区别在于取的值
            let { dispatch } = this.$store;
            if (namespace) {
                let rawModules = this.$store._modulesNamespaceMap[namespace];
                if (!rawModules) {
                    return;
                }
                dispatch = rawModules.context.dispatch;
            }
            // 如果传入的是函数,传递参数并执行函数,如果是 key 字段,直接执行
            return typeof value === 'function'
                ? value.apply(this, [dispatch].concat(args))
                : dispatch.call(this.$store, value, ...args);
        };
    });
    return res;
});

const mapGetters = normalizeNamespace((namespace, getters) => {
    const res = {};
    normalizeMap(getters).forEach(({ key, value }) => {
        value = namespace + value;
        res[key] = function mappedGetter() {
            return this.$store.getters[value];
        };
    });
    return res;
});
