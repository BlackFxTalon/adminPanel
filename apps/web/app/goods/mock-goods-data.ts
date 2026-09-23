import type { GoodsSection, GoodsBoardData } from './goods-data'

const sections: readonly GoodsSection[] = [
  { id: 'goods-1', kind: 'goods', title: 'Промышленный редуктор РЧ-160', description: 'Передаточное число 20:1, масса 125 кг.' },
  { id: 'goods-2', kind: 'prices', title: 'Прайс-лист 2026', description: 'Актуальные цены на номенклатуру склада.' },
  { id: 'goods-3', kind: 'categories', title: 'Редукторы', description: 'Цилиндрические и червячные редукторы.' },
  { id: 'goods-4', kind: 'characteristics', title: 'Характеристики: крутящий момент', description: 'Диапазон 100–4000 Н·м.' },
]

export function createMockGoodsData(): GoodsBoardData {
  return {
    async sections() {
      return sections
    },
  }
}
