import { Suspense } from 'react'
import type { Item } from '../../types/project'
import { num, bool } from '../../lib/params'
import { catalogById } from './catalog'
import { Mat } from './models/shared'
import {
  Sofa,
  Chair,
  Stool,
  Bed,
  Table,
  Cabinet,
  Shelf,
  Appliance,
  Hood,
  Sink,
  Toilet,
  Bathtub,
  Shower,
  Toiletries,
  Lamp,
  Plant,
  Piano,
  Vase,
  Picture,
  Pendant,
  TV,
  Curtain,
  GLBModel,
} from './models'

// Dispatches an Item to its parametric 3D model. Models live in ./models/*.
export function FurnitureModel({ item }: { item: Item }) {
  const entry = catalogById(item.catalogId)
  const size = entry?.size ?? { w: 1, d: 1, h: 1 }
  const m = item.material

  switch (item.kind) {
    case 'sofa':
      return <Sofa w={size.w} d={size.d} h={size.h} chaise={bool(item.params?.chaise, false)} m={m} />
    case 'bed':
      return <Bed w={size.w} d={size.d} m={m} />
    case 'table':
      return <Table w={size.w} d={size.d} h={size.h} m={m} />
    case 'chair':
      return <Chair w={size.w} d={size.d} h={size.h} m={m} />
    case 'wardrobe':
      return <Cabinet w={size.w} d={size.d} h={size.h} doors={num(item.params?.doors, 2)} counter={false} m={m} />
    case 'cabinet':
      return (
        <Cabinet
          w={num(item.params?.width, size.w)}
          d={num(item.params?.depth, size.d)}
          h={num(item.params?.height, size.h)}
          doors={num(item.params?.doors, 2)}
          counter={bool(item.params?.counter, false)}
          corner={bool(item.params?.corner, false)}
          legLen={num(item.params?.legLen, 1.0)}
          m={m}
        />
      )
    case 'shelf':
      return <Shelf w={size.w} d={size.d} h={size.h} shelves={num(item.params?.shelves, 4)} m={m} />
    case 'stool':
      return <Stool w={size.w} h={size.h} m={m} />
    case 'tv':
      return <TV w={size.w} h={size.h} m={m} />
    case 'toilet':
      return <Toilet w={size.w} d={size.d} h={size.h} m={m} />
    case 'sink':
      return <Sink w={size.w} d={size.d} h={size.h} m={m} />
    case 'bathtub':
      return <Bathtub w={size.w} d={size.d} h={size.h} m={m} />
    case 'pendant':
      return <Pendant m={m} />
    case 'rug':
      return (
        <mesh position={[0, 0.011, 0]} receiveShadow>
          <boxGeometry args={[size.w, 0.02, size.d]} />
          <Mat material={m} repeat={[2, 2]} />
        </mesh>
      )
    case 'lamp':
      return <Lamp h={size.h} m={m} />
    case 'piano':
      return <Piano w={size.w} d={size.d} h={size.h} m={m} />
    case 'vase':
      return <Vase w={size.w} h={size.h} flowers={bool(item.params?.flowers, false)} m={m} />
    case 'plant':
      return <Plant h={size.h} tall={bool(item.params?.tall, false)} m={m} />
    case 'picture':
      return (
        <Picture
          w={size.w}
          h={size.h}
          round={bool(item.params?.round, false)}
          mirror={bool(item.params?.mirror, false)}
          m={m}
        />
      )
    case 'appliance':
      return <Appliance w={size.w} d={size.d} h={size.h} roundDoor={bool(item.params?.roundDoor, false)} m={m} />
    case 'hood':
      return <Hood w={size.w} d={size.d} h={size.h} m={m} />
    case 'shower':
      return <Shower w={size.w} d={size.d} h={size.h} m={m} />
    case 'toiletries':
      return <Toiletries m={m} />
    case 'curtain':
      return <Curtain w={size.w} h={size.h} blinds={bool(item.params?.blinds, false)} m={m} />
    case 'glb':
      return item.modelUrl ? (
        <Suspense fallback={null}>
          <GLBModel url={item.modelUrl} m={m} />
        </Suspense>
      ) : null
    default:
      return (
        <mesh castShadow>
          <boxGeometry args={[size.w, size.h, size.d]} />
          <Mat material={m} />
        </mesh>
      )
  }
}
