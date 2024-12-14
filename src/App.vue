<template>
	<div class="es-container">
		<div class="menu">
			<div
				v-for="t in types"
				:draggable="true"
				@dragstart="addType = t.type"
			>{{ t.value }}</div>
		</div>
		<div class="content">
			<div class="btn-box">
				<div class="btn">
					<div class="btn-item" @click.stop="undo">撤销</div>
					<div class="btn-item" @click.stop="redo">重做</div>
				</div>
			</div>
			<div
				class="es-editor"
				@mousedown="onEditorMouseDown"
				@dragover.prevent
				@drop="drop"
			>
				<Drager
					v-for="(item, index) in data"
					v-bind="item"
					rotatable
					boundary
					:snapToGrid="grid != 0"
					:gridX="grid"
					:gridY="grid"
					@change="onChange($event, item)"
					@drag-start="onDragStart(index)"
					@drag="onDrag"
					@drag-end="dragEnd"
					@click.stop="check(index)"
					@mousedown.stop
				>
					<template v-if="Array.isArray(item.value)">
            <div v-for="i in item.value">
              <div
                v-if="i.type == 'text'"
                class="item"
                :style="{
                  width: i.width + 'px',
                  height: i.height + 'px',
                  top: i.top + 'px',
                  left: i.left + 'px',
                }"
              >
                {{ i.value }}
              </div>
              <img
                v-else-if="i.type == 'image'"
                class="item"
                :style="{
                  width: i.width + 'px',
                  height: i.height + 'px',
                  top: i.top + 'px',
                  left: i.left + 'px',
                }"
                :src="i.value"
                alt=""
              />
            </div>
          </template>
          <template v-else>
            <div v-if="item.type == 'text'">{{ item.value }}</div>
            <textarea
              v-else-if="item.type == 'input'"
              autofocus
              type="text"
              :style="{ width: item.width + 'px', height: item.height + 'px' }"
              v-model="item.value"
            />
            <img
              v-else-if="item.type == 'image'"
              :style="{ width: item.width + 'px', height: item.height + 'px' }"
              :src="item.value"
              alt=""
            />
          </template>
				</Drager>
				<Area ref="areaRef" @move="onAreaMove" @up="onAreaUp" />
				<GridRect />
				<div
          v-show="markLine.left"
          class="es-markline-left"
          :style="{ left: markLine.left + 'px' }"
        ></div>
        <div
          v-show="markLine.top"
          class="es-markline-top"
          :style="{ top: markLine.top + 'px' }"
        ></div>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import { reactive, ref, onMounted, watch } from 'vue'
// 锁定版本为 v1.2.1，升级后会出现样式问题
import Drager, { type DragData } from 'es-drager'
import GridRect from './component/GridRect.vue'
import Area from './component/Area.vue'
import { uuid, diff } from './utils'

const types = reactive({
	"text": {
		type: 'text',
		value: '文本',
		defaultContent: '输入文本'
	},
	"image": {
		type: 'image',
		value: '图片',
		defaultContent: 'https://turntip.cn/uploads/sucai/11_189dd429f23.webp'
	}
})

const defaultStyle = reactive({
	"text": {
		width: 200,
		height: 50,
		angle: 0
	},
	"image": {
		width: 100,
		height: 100,
		angle: 0
	}
})

const addType = ref() // 记录拖拽类型
const areaRef = ref() // 选区
// const current = ref() // 当前历史记录位置, -1表示不查看当前历史记录
// const currentIndex = ref(-1) // 记录正在被拖拽的元素
const hasAreaSelected = ref(false) // 是否有选中元素
const isupd = ref(true) // 是否允许记录历史状态
const temp = ref<any>() // 临时存放历史记录
// 添加拖拽位置
const addDistance = ref({
	left: 0,
	top: 0
})
// 参考线变量
const lines = ref({ x: [], y: [] })
// 辅助线位置
const markLine = ref({
	top: null,
	left: null
})
// 记录移动距离
const moveDragData = ref({
	prevTop: 0,
	prevLeft: 0
})
// 画布上的元素
const data = ref<any[]>([
	{
		id: 1,
		type: 'text',
		value: '画布元素',
		width: 100,
		height: 100,
		left: 100,
		top: 100,
		angle: 0,
	}
])
const grid = ref(10) // 网格大小

const recordManage = ref<any>({
	snapshots: [], // 记录的历史状态快照
	curIndex: 0, // 记录正在被拖拽的元素
	maxLimit: 50 // 最大记录数
})
// 深度监听画布上的元素变化
watch(() => data.value, (newV) => {
	temp.value = JSON.parse(JSON.stringify(newV))
}, { deep: true })

// 监听元素数组变化，并添加记录
watch(() => data.value.length, () => {
	recording()
})

// 鼠标按下编辑器区域事件
const onEditorMouseDown = (e: MouseEvent) => {
	// 取消选中的目标
	data.value.forEach((d: any) => { d.selected = false })
	areaRef.value.onMouseDown(e)
}

// 框选完成遍历元素数组
const onAreaMove = (areaData: DragData) => {
	data.value.forEach((d: any) => {
		const containLeft = areaData.left < d.left && areaData.left + areaData.width >= d.left + d.width
		const containTop = areaData.top < d.top && areaData.top + areaData.height >= d.top + d.height
		d.selected = !!(containLeft && containTop)
	})
}

// 松开区域选择
const onAreaUp = () => {
	hasAreaSelected.value = data.value.some((d: any) => d.selected)
	// 如果区域有选中元素
	if (hasAreaSelected.value) {
		setTimeout(() => {
			document.addEventListener('click', () => {
				hasAreaSelected.value = false
			}, { once: true })
		})
	}
}

// 拖进画布时的回调
const drop = (e: any) => {
	addDistance.value = {
		top: e.layerY,
		left: e.layerX
	}
	push(addType.value)
}

// 开始移动
const onChange = (dragData: DragData, item: any) => {
	
}

// 开始拖拽
const onDragStart = (index: number) => {
	// 获取当前拖拽元素
	const current = data.value[index]
	// 记录开始拖拽时选中的数据，为了计算多个选中时移动的距离
	moveDragData.value.prevTop = current.top
	moveDragData.value.prevLeft = current.left
	// 当前记录
	recordManage.value.curIndex = index

	// 计算参考线并获取参考线信息
	lines.value = calcLines()
}

// 拖拽中
const onDrag = (dragData: DragData) => {
	// 参考线代码
	markLine.value.top = null;
	markLine.value.left = null;
	for (let i = 0; i < lines.value.y.length; i++) {
		const { top, showTop } = lines.value.y[i]
		if (Math.abs(top - dragData.top) < 5) {
			markLine.value.top = showTop
			break
		}
	}
	for (let i = 0; i < lines.value.x.length; i++) {
		const { left, showLeft } = lines.value.x[i]
		if (Math.abs(left - dragData.left) < 5) {
			markLine.value.left = showLeft
			break
		}
	}

	// 计算拖拽横向和纵向距离
	const disX = dragData.left - moveDragData.value.prevLeft
	const disY = dragData.top - moveDragData.value.prevTop
	// 如果选中了多个
	data.value.forEach((item: any, index: number) => {
		if (item.selected && recordManage.value.curIndex !== index) {
			// 将选中且不是当前拖拽的元素，同时进行移动
			item.top! += disY
			item.left! += disX
		}
	})
	// 更新记录当前移动距离
	moveDragData.value.prevTop = dragData.top
	moveDragData.value.prevLeft = dragData.left
}

// 拖拽结束
const dragEnd = () => {
	isupd.value = true
	// 拖拽结束后重置辅助线数据
	markLine.value = {
		top: null,
		left: null
	}
	recording()
}

// 选中元素
const check = (index: number) => {
	data.value.forEach((d: any) => d.selected = false)
	data.value[index].selected = true
}

// 初始化拖拽位置
const reset = () => {
	addDistance.value = {
		top: 0,
		left: 0
	}
}

// 计算辅助线的位置
const calcLines = () => {
	const lines: any = { x: [], y: [] }
	// 当前拖拽元素大小
	const { width, height } = data.value[recordManage.value.curIndex!] as any
	// 循环遍历画布所有元素，将除当前拖拽元素外所有其它元素生成辅助线的位置保存，每个元素x和y都会有5种
	data.value.forEach((block, i: number) => {
		if (recordManage.value.curIndex! === i) return
		const { top: ATop, left: ALeft, width: AWidth, height: AHeight } = block as any

		lines.x.push({ showLeft: ALeft, left: ALeft })
		lines.x.push({ showLeft: ALeft + AWidth, left: ALeft + AWidth })
		lines.x.push({ showLeft: ALeft + AWidth / 2, left: ALeft + AWidth / 2 - width / 2 })
		lines.x.push({ showLeft: ALeft + AWidth, left: ALeft + AWidth - width })
		lines.x.push({ showLeft: ALeft, left: ALeft - width })

		lines.y.push({ showTop: ATop, top: ATop })
		lines.y.push({ showTop: ATop, top: ATop - height })
		lines.y.push({ showTop: ATop + AHeight / 2, top: ATop + AHeight / 2 - height / 2 })
		lines.y.push({ showTop: ATop + AHeight, top: ATop + AHeight })
		lines.y.push({ showTop: ATop + AHeight, top: ATop + AHeight - height })
	})
	return lines
}

// 添加画布元素
const push = (type: string) => {
	data.value.push({
		id: uuid(),
		type,
		value: types[type].defaultContent,
		...defaultStyle[type],
		...addDistance.value
	})
	reset()
}

// 撤销
const undo = () => {
	// 没有可撤销元素
	if (recordManage.value.curIndex === 0) return
	// 返回上一个历史记录
	recordManage.value.curIndex--
	data.value = recordManage.value.snapshots[recordManage.value.curIndex]
}

// 重做
const redo = () => {
	const { snapshots, curIndex } = recordManage.value
	if (curIndex >= snapshots.length - 1) return
	recordManage.value.curIndex++
	data.value = recordManage.value.snapshots[recordManage.value.curIndex]
}

// 记录状态
const recording = () => {
	const { snapshots, curIndex, maxLimit } = recordManage.value
	// 如果两个状态相同，则不添加历史记录
	if (!diff(temp.value, snapshots[curIndex])) return false
	// 如果在撤销过程中执行了新的操作，则覆盖上一个状态
	if (snapshots.length - 1 === curIndex) {
		snapshots.splice(curIndex + 1, snapshots.length)
	}
	// 超过最大限制记录
	if (snapshots.length > maxLimit) {
		snapshots.shift()
	}

	// 更新记录并重置临时历史记录
	recordManage.value.snapshots.push(temp.value)
	recordManage.value.curIndex = recordManage.value.snapshots.length - 1
	temp.value = []
	console.log('recordManage', recordManage.value)
}

onMounted(() => {
	// 把最开始的状态记录下来
	recordManage.value.snapshots.push(JSON.parse(JSON.stringify(data.value)))
})

</script>

<style lang="scss" scoped>
.es-container {
	width: 100vw;
	height: 100vh;
	overflow: hidden;
	position: relative;
	display: flex;
	background: rgb(26, 26, 26);

	.menu {
		width: 200px;
		height: 200px;
		padding: 0 20px;
		box-sizing: border-box;
		padding: 20px;
		display: flex;
		flex-wrap: wrap;
		justify-content: space-between;

		>div {
			width: 45%;
			height: 40px;
			text-align: center;
			line-height: 40px;
			cursor: pointer;
			border: 1px solid #363637;
			border-radius: 10px;
			color: #f7f7f7;
		}
	}

	.content {
		flex: 1;

		.es-editor {
			width: 100%;
			height: 100%;
			position: relative;
			color: gray;

			.es-markline-left,
			.es-markline-top {
				position: absolute;
				border: 1px dashed rgb(58, 122, 254);
			}

			.es-markline-left {
				height: 100%;
				width: 1px;
				top: 0;
			}

			.es-markline-top {
				width: 100%;
				height: 1px;
				left: 0;
			}

			::v-deep(audio) {
				margin: 0 auto;
				display: block;
			}

			textarea {
				background: transparent;
				border: none;
				color: gray;
				resize: none;
			}

			.item {
				border: 1px solid rgb(58, 122, 254);
				position: absolute;
			}
		}

		.btn-box {
			top: 20px;
			position: absolute;
			right: 20px;
			z-index: 9;
			display: flex;

			.btn {
				height: 50px;
				margin-right: 100px;
				display: flex;
				justify-content: space-between;

				// background: white;
				left: calc(100% / 2 - 600px / 2);
				border-radius: 10px;

				.btn-item {
					text-align: center;
					margin: 20px;
					display: flex;
					justify-content: center;
					align-items: center;
					cursor: pointer;

					input {
						width: 30px;
						height: 20px;
						border: none;
						margin-left: 10px;
						background: #e6e3e3;
						text-align: center;
						line-height: 20px;
					}
				}
			}

			.toDooring {
				margin-left: 20px;
				min-width: 220px;
				height: 30px;
				align-items: center;
				display: flex;
				background: #06c;
				color: white;
				padding: 20px;
				cursor: pointer;
				border-radius: 6px;
			}
		}
	}
}
</style>

