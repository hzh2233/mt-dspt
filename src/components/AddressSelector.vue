<template>
  <div class="address-selector">
    <el-cascader
      v-model="selectedRegion"
      :options="regionOptions"
      :props="cascaderProps"
      placeholder="请选择省市区"
      style="width: 100%"
      @change="handleRegionChange"
      clearable
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import regionsData from '@/data/regions.json'

interface RegionItem {
  code: string
  name: string
  children?: RegionItem[]
}

interface SelectedRegion {
  provinceCode: string
  provinceName: string
  cityCode: string
  cityName: string
  districtCode: string
  districtName: string
}

interface Props {
  modelValue?: SelectedRegion | null
}

interface Emits {
  (e: 'update:modelValue', value: SelectedRegion | null): void
  (e: 'change', value: SelectedRegion | null): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const selectedRegion = ref<string[]>([])
const regionOptions = ref<RegionItem[]>([])

const cascaderProps = {
  value: 'code',
  label: 'name',
  children: 'children',
  emitPath: true,
  checkStrictly: false
}

// 监听外部传入的值变化
watch(
  () => props.modelValue,
  (newValue) => {
    if (newValue) {
      selectedRegion.value = [
        newValue.provinceCode,
        newValue.cityCode,
        newValue.districtCode
      ]
    } else {
      selectedRegion.value = []
    }
  },
  { immediate: true }
)

// 处理地区选择变化
const handleRegionChange = (value: string[]) => {
  if (!value || value.length !== 3) {
    emit('update:modelValue', null)
    emit('change', null)
    return
  }

  const [provinceCode, cityCode, districtCode] = value
  
  // 根据代码查找对应的名称
  const province = regionOptions.value.find(p => p.code === provinceCode)
  const city = province?.children?.find(c => c.code === cityCode)
  const district = city?.children?.find(d => d.code === districtCode)

  if (province && city && district) {
    const result: SelectedRegion = {
      provinceCode,
      provinceName: province.name,
      cityCode,
      cityName: city.name,
      districtCode,
      districtName: district.name
    }
    
    emit('update:modelValue', result)
    emit('change', result)
  } else {
    // 即使找不到完整的地区信息，也要触发change事件
    console.warn('地区信息不完整:', { provinceCode, cityCode, districtCode })
    emit('update:modelValue', null)
    emit('change', null)
  }
}

// 初始化地区数据
onMounted(() => {
  regionOptions.value = regionsData as RegionItem[]
})
</script>

<style scoped lang="scss">
.address-selector {
  width: 100%;
}
</style>