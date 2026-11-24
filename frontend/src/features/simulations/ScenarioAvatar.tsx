import {
  AnatomyCanvas,
  defaultLayerOpacity,
  initialVisibleLayers,
  type AnatomyLayerId,
} from '../body-viewer/AnatomyCanvas'

const scenarioLayerIds: AnatomyLayerId[] = ['skin']

type ScenarioAvatarProps = {
  heightScale?: number
  modelScale?: number
}

export default function ScenarioAvatar({ modelScale = 1, heightScale = 1 }: ScenarioAvatarProps) {
  return (
    <AnatomyCanvas
      className="scenario-model-canvas"
      layerIds={scenarioLayerIds}
      visibleLayers={initialVisibleLayers}
      layerOpacity={defaultLayerOpacity}
      wireframe={false}
      autoRotate
      modelScale={modelScale} heightScale={heightScale}
    />
  )
}
