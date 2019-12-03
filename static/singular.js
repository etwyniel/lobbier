
let wasm;

function _assertClass(instance, klass) {
    if (!(instance instanceof klass)) {
        throw new Error(`expected instance of ${klass.name}`);
    }
    return instance.ptr;
}

let cachegetInt32Memory = null;
function getInt32Memory() {
    if (cachegetInt32Memory === null || cachegetInt32Memory.buffer !== wasm.memory.buffer) {
        cachegetInt32Memory = new Int32Array(wasm.memory.buffer);
    }
    return cachegetInt32Memory;
}

let cachedTextDecoder = new TextDecoder('utf-8', { ignoreBOM: true, fatal: true });

cachedTextDecoder.decode();

let cachegetUint8Memory = null;
function getUint8Memory() {
    if (cachegetUint8Memory === null || cachegetUint8Memory.buffer !== wasm.memory.buffer) {
        cachegetUint8Memory = new Uint8Array(wasm.memory.buffer);
    }
    return cachegetUint8Memory;
}

function getStringFromWasm(ptr, len) {
    return cachedTextDecoder.decode(getUint8Memory().subarray(ptr, ptr + len));
}

const heap = new Array(32);

heap.fill(undefined);

heap.push(undefined, null, true, false);

let stack_pointer = 32;

function addBorrowedObject(obj) {
    if (stack_pointer == 1) throw new Error('out of js stack');
    heap[--stack_pointer] = obj;
    return stack_pointer;
}

const u32CvtShim = new Uint32Array(2);

const uint64CvtShim = new BigUint64Array(u32CvtShim.buffer);

function getObject(idx) { return heap[idx]; }

let heap_next = heap.length;

function dropObject(idx) {
    if (idx < 36) return;
    heap[idx] = heap_next;
    heap_next = idx;
}

function takeObject(idx) {
    const ret = getObject(idx);
    dropObject(idx);
    return ret;
}

function addHeapObject(obj) {
    if (heap_next === heap.length) heap.push(heap.length + 1);
    const idx = heap_next;
    heap_next = heap[idx];

    heap[idx] = obj;
    return idx;
}

let WASM_VECTOR_LEN = 0;

let cachedTextEncoder = new TextEncoder('utf-8');

const encodeString = (typeof cachedTextEncoder.encodeInto === 'function'
    ? function (arg, view) {
    return cachedTextEncoder.encodeInto(arg, view);
}
    : function (arg, view) {
    const buf = cachedTextEncoder.encode(arg);
    view.set(buf);
    return {
        read: arg.length,
        written: buf.length
    };
});

function passStringToWasm(arg) {

    let len = arg.length;
    let ptr = wasm.__wbindgen_malloc(len);

    const mem = getUint8Memory();

    let offset = 0;

    for (; offset < len; offset++) {
        const code = arg.charCodeAt(offset);
        if (code > 0x7F) break;
        mem[ptr + offset] = code;
    }

    if (offset !== len) {
        if (offset !== 0) {
            arg = arg.slice(offset);
        }
        ptr = wasm.__wbindgen_realloc(ptr, len, len = offset + arg.length * 3);
        const view = getUint8Memory().subarray(ptr + offset, ptr + len);
        const ret = encodeString(arg, view);

        offset += ret.written;
    }

    WASM_VECTOR_LEN = offset;
    return ptr;
}

function getArrayU8FromWasm(ptr, len) {
    return getUint8Memory().subarray(ptr / 1, ptr / 1 + len);
}

function handleError(e) {
    wasm.__wbindgen_exn_store(addHeapObject(e));
}
/**
*/
export const Color = Object.freeze({ Red:0,Green:1,Yellow:2,Blue:3, });
/**
*/
export const CardType = Object.freeze({ N0:0,N1:1,N2:2,N3:3,N4:4,N5:5,N6:6,N7:7,N8:8,N9:9,PlusTwo:10,Skip:11,Reverse:12,Wild:13,PlusFour:14, });
/**
*/
export const Direction = Object.freeze({ Clockwise:0,CounterClockwise:1, });
/**
*/
export const PlayResult = Object.freeze({ InvalidCard:0,CardPlayed:1,Nothing:2,GameOver:3, });
/**
*/
export class Card {

    static __wrap(ptr) {
        const obj = Object.create(Card.prototype);
        obj.ptr = ptr;

        return obj;
    }

    free() {
        const ptr = this.ptr;
        this.ptr = 0;

        wasm.__wbg_card_free(ptr);
    }
    /**
    * @param {Card} other
    * @returns {boolean}
    */
    compatible_with(other) {
        _assertClass(other, Card);
        const ptr0 = other.ptr;
        other.ptr = 0;
        const ret = wasm.card_compatible_with(this.ptr, ptr0);
        return ret !== 0;
    }
    /**
    * @returns {number}
    */
    get color() {
        const ret = wasm.card_color(this.ptr);
        return ret;
    }
    /**
    * @returns {boolean}
    */
    is_wild() {
        const ret = wasm.card_is_wild(this.ptr);
        return ret !== 0;
    }
    /**
    * @returns {number}
    */
    get ty() {
        const ret = wasm.card_ty(this.ptr);
        return ret;
    }
    /**
    * @returns {string}
    */
    display_ty() {
        const retptr = 8;
        const ret = wasm.card_display_ty(retptr, this.ptr);
        const memi32 = getInt32Memory();
        const v0 = getStringFromWasm(memi32[retptr / 4 + 0], memi32[retptr / 4 + 1]).slice();
        wasm.__wbindgen_free(memi32[retptr / 4 + 0], memi32[retptr / 4 + 1] * 1);
        return v0;
    }
    /**
    * @param {any} value
    * @returns {Card}
    */
    constructor(value) {
        try {
            const ret = wasm.card_from_jsvalue(addBorrowedObject(value));
            return Card.__wrap(ret);
        } finally {
            heap[stack_pointer++] = undefined;
        }
    }
    /**
    * @returns {string}
    */
    display() {
        const retptr = 8;
        const ret = wasm.card_display(retptr, this.ptr);
        const memi32 = getInt32Memory();
        const v0 = getStringFromWasm(memi32[retptr / 4 + 0], memi32[retptr / 4 + 1]).slice();
        wasm.__wbindgen_free(memi32[retptr / 4 + 0], memi32[retptr / 4 + 1] * 1);
        return v0;
    }
    /**
    * @returns {string}
    */
    display_alt() {
        const retptr = 8;
        const ret = wasm.card_display_alt(retptr, this.ptr);
        const memi32 = getInt32Memory();
        const v0 = getStringFromWasm(memi32[retptr / 4 + 0], memi32[retptr / 4 + 1]).slice();
        wasm.__wbindgen_free(memi32[retptr / 4 + 0], memi32[retptr / 4 + 1] * 1);
        return v0;
    }
}
/**
*/
export class Game {

    static __wrap(ptr) {
        const obj = Object.create(Game.prototype);
        obj.ptr = ptr;

        return obj;
    }

    free() {
        const ptr = this.ptr;
        this.ptr = 0;

        wasm.__wbg_game_free(ptr);
    }
    /**
    * @param {Player} player
    * @param {boolean} is_host
    * @returns {Game}
    */
    constructor(player, is_host) {
        _assertClass(player, Player);
        const ptr0 = player.ptr;
        player.ptr = 0;
        const ret = wasm.game_new(ptr0, is_host);
        return Game.__wrap(ret);
    }
    /**
    * @param {Player} player
    */
    add_player(player) {
        _assertClass(player, Player);
        const ptr0 = player.ptr;
        player.ptr = 0;
        wasm.game_add_player(this.ptr, ptr0);
    }
    /**
    * @param {number} id
    */
    remove_player(id) {
        wasm.game_remove_player(this.ptr, id);
    }
    /**
    */
    reset() {
        wasm.game_reset(this.ptr);
    }
    /**
    * @returns {number}
    */
    get current_player() {
        const ret = wasm.game_current_player(this.ptr);
        return ret >>> 0;
    }
    /**
    * @param {number} card_index
    * @returns {number}
    */
    play_index(card_index) {
        const ret = wasm.game_play_index(this.ptr, card_index);
        return ret;
    }
    /**
    * @param {Card} card
    * @returns {number}
    */
    play(card) {
        _assertClass(card, Card);
        const ptr0 = card.ptr;
        card.ptr = 0;
        const ret = wasm.game_play(this.ptr, ptr0);
        return ret;
    }
    /**
    */
    shuffle() {
        wasm.game_shuffle(this.ptr);
    }
    /**
    * @returns {number}
    */
    color() {
        const ret = wasm.game_color(this.ptr);
        return ret;
    }
    /**
    * @returns {number}
    */
    get direction() {
        const ret = wasm.game_direction(this.ptr);
        return ret;
    }
    /**
    * @returns {Card}
    */
    get last() {
        const ret = wasm.game_last(this.ptr);
        return Card.__wrap(ret);
    }
    /**
    * @returns {BigInt}
    */
    get draw_count() {
        const retptr = 8;
        const ret = wasm.game_draw_count(retptr, this.ptr);
        const memi32 = getInt32Memory();
        u32CvtShim[0] = memi32[retptr / 4 + 0];
        u32CvtShim[1] = memi32[retptr / 4 + 1];
        const n0 = uint64CvtShim[0];
        return n0;
    }
    /**
    * @returns {Card}
    */
    draw_one() {
        const ret = wasm.game_draw_one(this.ptr);
        return Card.__wrap(ret);
    }
    /**
    */
    end_turn() {
        wasm.game_end_turn(this.ptr);
    }
    /**
    * @returns {any}
    */
    get players() {
        const ret = wasm.game_players(this.ptr);
        return takeObject(ret);
    }
    /**
    * @param {any} event
    * @returns {number}
    */
    handle_event(event) {
        const ret = wasm.game_handle_event(this.ptr, addHeapObject(event));
        return ret;
    }
    /**
    * @param {any} event
    */
    handle_host_event(event) {
        wasm.game_handle_host_event(this.ptr, addHeapObject(event));
    }
    /**
    * @returns {number}
    */
    draw_len() {
        const ret = wasm.game_draw_len(this.ptr);
        return ret >>> 0;
    }
    /**
    * @returns {number}
    */
    discard_len() {
        const ret = wasm.game_discard_len(this.ptr);
        return ret >>> 0;
    }
    /**
    * @returns {any}
    */
    own_hand() {
        const ret = wasm.game_own_hand(this.ptr);
        return takeObject(ret);
    }
    /**
    * @returns {any}
    */
    init_event() {
        const ret = wasm.game_init_event(this.ptr);
        return takeObject(ret);
    }
    /**
    * @returns {any}
    */
    end_turn_event() {
        const ret = wasm.game_end_turn_event(this.ptr);
        return takeObject(ret);
    }
    /**
    * @param {number} card_index
    * @param {number} color
    */
    set_wild_color(card_index, color) {
        wasm.game_set_wild_color(this.ptr, card_index, color);
    }
    /**
    * @param {number} card_index
    * @returns {any}
    */
    play_card_event(card_index) {
        const ret = wasm.game_play_card_event(this.ptr, card_index);
        return takeObject(ret);
    }
    /**
    * @returns {any}
    */
    deal_event() {
        const ret = wasm.game_deal_event(this.ptr);
        return takeObject(ret);
    }
    /**
    * @returns {any}
    */
    draw_request() {
        const ret = wasm.game_draw_request(this.ptr);
        return takeObject(ret);
    }
    /**
    * @returns {any}
    */
    draw_response() {
        const ret = wasm.game_draw_response(this.ptr);
        return takeObject(ret);
    }
}
/**
*/
export class Player {

    static __wrap(ptr) {
        const obj = Object.create(Player.prototype);
        obj.ptr = ptr;

        return obj;
    }

    free() {
        const ptr = this.ptr;
        this.ptr = 0;

        wasm.__wbg_player_free(ptr);
    }
    /**
    * @param {string} name
    * @param {number} id
    * @returns {Player}
    */
    constructor(name, id) {
        const ret = wasm.player_new(passStringToWasm(name), WASM_VECTOR_LEN, id);
        return Player.__wrap(ret);
    }
    /**
    * @param {string} name
    */
    set name(name) {
        wasm.player_set_name(this.ptr, passStringToWasm(name), WASM_VECTOR_LEN);
    }
    /**
    * @returns {string}
    */
    get name() {
        const retptr = 8;
        const ret = wasm.player_name(retptr, this.ptr);
        const memi32 = getInt32Memory();
        const v0 = getStringFromWasm(memi32[retptr / 4 + 0], memi32[retptr / 4 + 1]).slice();
        wasm.__wbindgen_free(memi32[retptr / 4 + 0], memi32[retptr / 4 + 1] * 1);
        return v0;
    }
    /**
    * @param {number} id
    */
    set id(id) {
        wasm.player_set_id(this.ptr, id);
    }
    /**
    * @returns {number}
    */
    get id() {
        const ret = wasm.player_id(this.ptr);
        return ret >>> 0;
    }
    /**
    * @param {Card} card
    */
    draw(card) {
        _assertClass(card, Card);
        const ptr0 = card.ptr;
        card.ptr = 0;
        wasm.player_draw(this.ptr, ptr0);
    }
    /**
    * @returns {any}
    */
    get hand() {
        const ret = wasm.player_hand(this.ptr);
        return takeObject(ret);
    }
}

function init(module) {
    if (typeof module === 'undefined') {
        module = import.meta.url.replace(/\.js$/, '_bg.wasm');
    }
    let result;
    const imports = {};
    imports.wbg = {};
    imports.wbg.__wbindgen_json_parse = function(arg0, arg1) {
        const ret = JSON.parse(getStringFromWasm(arg0, arg1));
        return addHeapObject(ret);
    };
    imports.wbg.__wbindgen_json_serialize = function(arg0, arg1) {
        const obj = getObject(arg1);
        const ret = JSON.stringify(obj === undefined ? null : obj);
        const ret0 = passStringToWasm(ret);
        const ret1 = WASM_VECTOR_LEN;
        getInt32Memory()[arg0 / 4 + 0] = ret0;
        getInt32Memory()[arg0 / 4 + 1] = ret1;
    };
    imports.wbg.__wbindgen_is_null = function(arg0) {
        const ret = getObject(arg0) === null;
        return ret;
    };
    imports.wbg.__wbindgen_object_drop_ref = function(arg0) {
        takeObject(arg0);
    };
    imports.wbg.__wbg_randomFillSync_eabbc18af655bfbe = function(arg0, arg1, arg2) {
        getObject(arg0).randomFillSync(getArrayU8FromWasm(arg1, arg2));
    };
    imports.wbg.__wbg_getRandomValues_40ceff860009fa55 = function(arg0, arg1, arg2) {
        getObject(arg0).getRandomValues(getArrayU8FromWasm(arg1, arg2));
    };
    imports.wbg.__wbg_self_e70540c4956ad879 = function() {
        try {
            const ret = self.self;
            return addHeapObject(ret);
        } catch (e) {
            handleError(e)
        }
    };
    imports.wbg.__wbg_require_9edeecb69c9dc31c = function(arg0, arg1) {
        const ret = require(getStringFromWasm(arg0, arg1));
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_crypto_58b0c631995fea92 = function(arg0) {
        const ret = getObject(arg0).crypto;
        return addHeapObject(ret);
    };
    imports.wbg.__wbindgen_is_undefined = function(arg0) {
        const ret = getObject(arg0) === undefined;
        return ret;
    };
    imports.wbg.__wbg_getRandomValues_532ec62d8e780edc = function(arg0) {
        const ret = getObject(arg0).getRandomValues;
        return addHeapObject(ret);
    };
    imports.wbg.__wbindgen_throw = function(arg0, arg1) {
        throw new Error(getStringFromWasm(arg0, arg1));
    };

    if ((typeof URL === 'function' && module instanceof URL) || typeof module === 'string' || (typeof Request === 'function' && module instanceof Request)) {

        const response = fetch(module);
        if (typeof WebAssembly.instantiateStreaming === 'function') {
            result = WebAssembly.instantiateStreaming(response, imports)
            .catch(e => {
                return response
                .then(r => {
                    if (r.headers.get('Content-Type') != 'application/wasm') {
                        console.warn("`WebAssembly.instantiateStreaming` failed because your server does not serve wasm with `application/wasm` MIME type. Falling back to `WebAssembly.instantiate` which is slower. Original error:\n", e);
                        return r.arrayBuffer();
                    } else {
                        throw e;
                    }
                })
                .then(bytes => WebAssembly.instantiate(bytes, imports));
            });
        } else {
            result = response
            .then(r => r.arrayBuffer())
            .then(bytes => WebAssembly.instantiate(bytes, imports));
        }
    } else {

        result = WebAssembly.instantiate(module, imports)
        .then(result => {
            if (result instanceof WebAssembly.Instance) {
                return { instance: result, module };
            } else {
                return result;
            }
        });
    }
    return result.then(({instance, module}) => {
        wasm = instance.exports;
        init.__wbindgen_wasm_module = module;

        return wasm;
    });
}

export default init;

