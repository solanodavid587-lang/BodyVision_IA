import {
  AnatomyCanvas,
  defaultLayerOpacity,
  initialVisibleLayers,
  type AnatomyLayerId,
} from '../body-viewer/AnatomyCanvas'
import type { BodyShape } from '../studio/bodyShape'

const scenarioLayerIds: AnatomyLayerId[] = ['skin']

type ScenarioAvatarProps = {
  heightScale?: number
  modelScale?: number
  bodyShape?: BodyShape
}

export default function ScenarioAvatar({ modelScale = 1, heightScale = 1, bodyShape }: ScenarioAvatarProps) {
  return (
    <AnatomyCanvas
      className="scenario-model-canvas"
      layerIds={scenarioLayerIds}
      visibleLayers={initialVisibleLayers}
      layerOpacity={defaultLayerOpacity}
      wireframe={false}
      autoRotate
      modelScale={modelScale} heightScale={heightScale} bodyShape={bodyShape}
    />
  )
}
