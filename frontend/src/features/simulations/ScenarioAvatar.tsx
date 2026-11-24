import {
  AnatomyCanvas,
  defaultLayerOpacity,
  initialVisibleLayers,
  type AnatomyLayerId,
} from '../body-viewer/AnatomyCanvas'

const scenarioLayerIds: AnatomyLayerId[] = ['skin']

type ScenarioAvatarProps = {
  modelScale?: number
}

export default function ScenarioAvatar({ modelScale = 1 }: ScenarioAvatarProps) {
  return (
    <AnatomyCanvas
      className="scenario-model-canvas"
      layerIds={scenarioLayerIds}
      visibleLayers={initialVisibleLayers}
      layerOpacity={defaultLayerOpacity}
      wireframe={false}
      autoRotate
      modelScale={modelScale}
    />
  )
}
