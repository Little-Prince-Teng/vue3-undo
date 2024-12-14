// 比较两个对象是否相等
export function isObjectsEqual(obj1: any, obj2: any) {
	delete obj1.selected;
	delete obj2.selected;
	const keys1 = Object.keys(obj1);
	const keys2 = Object.keys(obj2);

	if (keys1.length !== keys2.length) {
		return false;
	}

	for (const key of keys1) {
		if (obj1[key] !== obj2[key]) {
			return false;
		}
	}

	return true;
}

// 比较两个对象数组是否相等
export function isObjectArraysEqual(arr1: any[], arr2: any[]) {
	if (arr1.length !== arr2.length) {
		return false
	}

	for (let i = 0; i < arr1.length; i++) {
		const obj1 = arr1[i];
		const obj2 = arr2[i];

		// 比较对象的属性值是否相等
		if (!isObjectsEqual(obj1, obj2)) {
			return false;
		}
	}

	return true;
}

export function diff(obj1: any, obj2: any) {
	let result = false
	try {
		const o1 = JSON.stringify(obj1)
		const o2 = JSON.stringify(obj2)
		result = o1 !== o2
	} catch(err) {
		console.log(err)
	}
	return result
}