export interface GoodsSection {
  readonly id: string
  readonly kind: 'goods' | 'prices' | 'categories' | 'characteristics'
  readonly title: string
  readonly description: string
}

export interface GoodsBoardData {
  sections(): Promise<readonly GoodsSection[]>
}
