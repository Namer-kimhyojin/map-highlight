# 행정구역 지도 강조 이미지 제작기

React + TypeScript + Vite + OpenLayers 기반의 웹 지도 편집기입니다. 행정구역 GeoJSON을 지도 위에 표시하고, 선택 지역과 사용자 도형을 벡터 객체로 관리한 뒤 SVG, PNG, JSON으로 저장할 수 있습니다.

## 설치

```bash
npm install
```

## 실행

```bash
npm run dev
```

브라우저에서 `http://localhost:5173`으로 접속합니다.

## GeoJSON 데이터

`public/data`에 아래 파일을 둘 수 있습니다.

- `admin_sido.geojson`
- `admin_sigungu.geojson`
- `admin_emd.geojson`
- `sample_admin.geojson`

각 feature의 `properties`는 `code`, `name`, `level` 필드를 권장합니다. 없을 경우 일부 대체 필드도 읽습니다.

## 주요 기능

- OpenLayers 일반지도 및 위성지도 표시
- 시도, 시군구, 읍면동 GeoJSON 레이어 전환
- 행정구역 클릭 다중 선택 및 스타일 편집
- 주변지역 어둡게 처리, 비선택지역 흐리게/회색조 처리
- 폴리곤, 사각형, 원형, 선, 점 도형 그리기 및 수정
- 프로젝트 JSON 저장, 불러오기, LocalStorage 자동 저장
- PowerPoint 후편집을 고려한 레이어 구조 유지 SVG 내보내기
- 현재 지도 캔버스 기준 PNG 내보내기

## SVG 내보내기

SVG는 `background-map`, `dark-mask`, `admin-boundaries`, `highlight-regions`, `custom-shapes`, `labels` 레이어를 유지합니다. 행정구역과 도형은 `path`로 출력되며 `id`, `class`, `data-name`, `data-code`, `fill`, `stroke` 속성을 직접 가집니다.

## 프로젝트 JSON

저장 파일에는 지도 중심, 줌, 배경지도, 선택 행정구역 코드, 스타일, 강조 설정, 사용자 도형, 라벨, 출력 설정이 포함됩니다. 열기 버튼으로 다시 불러오면 상태가 복원됩니다.

## 향후 개발

- 라벨 충돌 회피
- 대용량 읍면동 데이터 클러스터링 및 단순화
- 선택지역 병합 SVG 출력
- 보고서 색상 프리셋과 범례 자동 생성
- 서버 저장 및 공유 링크
