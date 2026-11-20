from app.schemas.contracts import MeasurementCreate, ProfileCreate


def test_profile_contract_rejects_short_code():
    try:
        ProfileCreate(display_code='x', display_name='Expediente')
        assert False, 'Debe rechazar un código corto'
    except Exception:
        pass


def test_measurement_contract_accepts_observed_value():
    measurement = MeasurementCreate(
        metric_code='waist',
        value=84.5,
        unit='cm',
        method='manual',
        measured_at='2026-11-17T09:30:00-05:00',
    )
    assert measurement.value == 84.5
