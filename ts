import { AsyncPipe, CommonModule, NgFor, NgIf } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  HostListener,
  inject,
  model,
  OnInit,
  Renderer2,
  signal,
  ViewChild,
  ViewEncapsulation,
} from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { provideNativeDateAdapter } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIcon, MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import {
  MatSidenavContainer,
  MatSidenavModule,
} from '@angular/material/sidenav';
import { MatSliderModule } from '@angular/material/slider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { Router } from '@angular/router';
import moment from 'moment';
import { Feature, View } from 'ol';
import { defaults as defaultControls } from 'ol/control';
import { Extent } from 'ol/extent';
import { FeatureLike } from 'ol/Feature';
import GeoJSON from 'ol/format/GeoJSON';
import { Point, Polygon } from 'ol/geom';
import TileLayer from 'ol/layer/Tile';
import VectorLayer from 'ol/layer/Vector';
import VectorImageLayer from 'ol/layer/VectorImage';
import Map from 'ol/Map.js';
import Overlay from 'ol/Overlay';
import * as olProj from 'ol/proj';
import { fromLonLat, toLonLat, transform } from 'ol/proj';
import OSM from 'ol/source/OSM';
import VectorSource from 'ol/source/Vector';
import { Fill, Stroke, Text } from 'ol/style';
import Icon from 'ol/style/Icon';
import Style from 'ol/style/Style';
import { inflate } from 'pako';
import {
  BehaviorSubject,
  catchError,
  of,
  Subscription,
  switchMap,
  take,
} from 'rxjs';
import { AlertObservableService } from '../../services/alert-observable.service';
import { CacheDataService } from '../../services/cache_data.service';
import { DistrictAlertService } from '../../services/district-wise-alerts';
import { MapViewService } from '../../services/mapview-service';
import { RangeService } from '../../services/range.service';
import { SharedObservableService } from '../../services/shared-observable.service';
import { DialogService } from '../../utility/dialog.service';
import { POIConstant } from '../../utility/poi_constant';
import { RaiseIncidentsComponent } from '../raise-incidents/raise-incidents.component';
import { SearchAreaComponent } from '../search-area/search-area.component';

interface Weather {
  value: string;
  viewValue: string;
  icon: any;
}
interface location {
  value: string;
  viewValue: string;
  icon: any;
}
interface Local {
  value: string;
  viewValue: string;
  icon: any;
}

@Component({
  selector: 'app-map',
  standalone: true,
  imports: [
    MatIconModule,
    SearchAreaComponent,
    MatIcon,
    NgFor,
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    CommonModule,
    FormsModule,
    NgIf,
    MatIconModule,
    MatIcon,
    AsyncPipe,
    MatSidenavContainer,
    MatSidenavModule,
    MatCardModule,
    MatIconModule,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule,
    MatDatepickerModule,
    MatMenuModule,
    MatSliderModule,
    MatExpansionModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
  ],
  templateUrl: './map.component.html',
  styleUrl: './map.component.css',
  providers: [provideNativeDateAdapter()],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MapComponent implements OnInit, AfterViewInit {
  @ViewChild('map', { static: true }) mapElement!: ElementRef;
  @ViewChild('toggleWeather') toggleWeather!: ElementRef;
  @ViewChild('toggleWeatherOptions') toggleWeatherOptions!: ElementRef;
  private sharedObsService = inject(SharedObservableService);
  private alertObs = inject(AlertObservableService);
  private mapService = inject(MapViewService);
  private alertService = inject(DistrictAlertService);
  private cacheDataService = inject(CacheDataService);
  readonly panelOpenState = signal(false);
  public bankCtrl: FormControl = new FormControl();

  selected = model<Date | null>(null);
  map!: Map;
  overlay!: Overlay;
  pinOverlay!: Overlay;
  PROJECTION_EPSG_3857: string = 'EPSG:3857';
  PROJECTION_EPSG_4326: string = 'EPSG:4326';
  zoomDuration: number = 1000;
  featureMaxZoom: number = 15;
  isMobile = false;
  hideHelpInfo = false;
  // hideWeatherForecast: boolean = true;
  hideWeatherLive: boolean = false;
  selectDistrictPOI: boolean = false;
  container: any;
  content: any;
  closer: any;

  pinPopup: any;
  pinPopupCloser: any;
  pinPopupContent: any;

  weatherMap: any;
  localInsight: any;
  weatherDetail: any;
  redHazardRipple: any;
  orangeHazardRipple: any;
  hideWeather: boolean = false;
  hideAlerts: boolean = true;
  hideHazzardsMore: boolean = false;
  hideHazzardsAll: boolean = false;
  hideAlertPopup: boolean = false;
  hideAlertsInfo: boolean = false;
  hideAllAlerts: boolean = false;
  hidePOIs: boolean = false;
  hidePOIall: boolean = false;
  hideSearchInfo: boolean = false;
  hideShelterInfo: boolean = false;
  hideWeatherCalendar: boolean = false;
  chatWindow: boolean = false;
  chatUrl: string = 'http://220.225.195.184:8080/EWDSChatBot/';
  chatUrlSafe!: SafeResourceUrl;

  boundaryVectorLayer!: VectorImageLayer<any>;
  redHazardVectorLayer!: VectorLayer<any>;
  orangeHazardVectorLayer!: VectorLayer<any>;
  poiVectorLayer!: VectorLayer<any>;
  pinVectorLayer!: VectorLayer<any>;
  disasterVectorLayer!: VectorLayer<any>;
  disasterVectorLayer2!: VectorLayer<any>;
  tempVectorLayer!: VectorImageLayer<any>;
  populationVectorLayer!: VectorImageLayer<any>;
  shelterVectorLayer!: VectorLayer<any>;

  districtBoundaryVectorLayer!: VectorImageLayer<any>;
  talukBoundaryVectorLayer!: VectorImageLayer<any>;
  lsgBoundaryVectorLayer!: VectorImageLayer<any>;

  susceptibilityVectorImageLayer!: VectorImageLayer<any>;

  sharedSubscription!: Subscription;
  layerIdOfPOIs: any = [];
  districtIdAndName: any = [];
  isPinning = false;
  shift320: boolean = true;
  locations: any[] = [];

  actualWeatherSelect: boolean = false;
  weatherForecastSelect: boolean = false;

  private layerSubject: BehaviorSubject<Object[]> = new BehaviorSubject<
    Object[]
  >([]);
  layerArray$: any = this.layerSubject.asObservable();

  reloading: boolean = false;
  hideLocationSelection: any = null;
  weatherSelectionOption: boolean = false;
  raiseIncidentReference!: MatDialogRef<RaiseIncidentsComponent>;
  dialogSubscription!: Subscription;

  alertRange: boolean = true;
  hazardRange: boolean = false;
  rainRange: boolean = false;
  tempRange: boolean = false;
  windRange: boolean = false;
  humidityRange: boolean = false;
  populationRange: boolean = true;
  floodRange: boolean = false;
  landSlideRange: boolean = false;

  chatWindowClose: boolean = false;

  closeWeatherSelect: boolean = false;
  showWeatherSelect: boolean = true;

  outskirtBoundary: number = 1;
  boundaryThickness: number = 0.5;
  weatherBoundaryThickness: number = 0.3;

  rangeValue = 0;

  today: any = moment();
  tomorrow: any = this.today.clone().add(1, 'days').format('DD-MM-YYYY');
  dayAfterTomorrow: any = this.today
    .clone()
    .add(2, 'days')
    .format('DD-MM-YYYY');
  Yesterday: any = this.today.clone().add(-1, 'days').format('DD-MM-YYYY');
  dayBeforeYesterday: any = this.today
    .clone()
    .add(-2, 'days')
    .format('DD-MM-YYYY');

  createTextStyle = (
    feature: FeatureLike,
    resolution: number,
    boundary: String
  ): Text => {
    const align = 'center';
    const baseline = 'middle';
    const size = '13px';
    const height = '1.3';
    const weight = 'bold';
    const placement = 'point';
    const maxAngle = 45;
    const overflow = true;
    const rotation = 0;
    // const font = weight + ' ' + size + '/' + height + ' ' + 'Courier New';
    const fillColor =
      boundary === 'district'
        ? 'green'
        : boundary === 'taluk'
        ? 'blue'
        : boundary === 'state'
        ? 'red'
        : 'purple';
    const outlineColor = 'white';
    const outlineWidth = 2;

    return new Text({
      textAlign: align,
      textBaseline: baseline,
      font: 'bold 13px "Segoe UI", "Roboto", "Open Sans", sans-serif',
      // text: resolution > 2500 ? '' : `ℹ️ ` + feature.get('name'),
      text: resolution > 2500 ? '' : `${feature.get('name')}`,

      // text: resolution > 2500 ? '' : `ℹ️ ${feature.get('name')}`,
      fill: new Fill({ color: '#333' }),
      // stroke: new Stroke({ color: outlineColor, width: outlineWidth }),
      stroke: new Stroke({
        color: '#ffffff', // white outline
        width: 2,
      }),
      placement: placement,
      maxAngle: maxAngle,
      overflow: overflow,
      rotation: rotation,
    });
  };

  createTextStyleDisaster = (
    feature: FeatureLike,
    resolution: number,
    boundary: String
  ): Text => {
    const align = 'center';
    const baseline = 'middle';
    const size = '13px';
    const height = '1.3';
    const weight = 'bold';
    const placement = 'point';
    const maxAngle = 45;
    const overflow = true;
    const rotation = 0;
    // const font = weight + ' ' + size + '/' + height + ' ' + 'Courier New';
    const fillColor =
      boundary === 'district'
        ? 'green'
        : boundary === 'taluk'
        ? 'blue'
        : boundary === 'state'
        ? 'red'
        : 'purple';
    const outlineColor = 'white';
    const outlineWidth = 2;

    return new Text({
      textAlign: align,
      textBaseline: baseline,
      font: 'bold 13px "Segoe UI", "Roboto", "Open Sans", sans-serif',
      // text: resolution > 2500 ? '' : `ℹ️ ` + feature.get('name'),
      text: resolution > 2500 ? '' : `${feature.get('name')}\n ℹ️ `,

      // text: resolution > 2500 ? '' : `ℹ️ ${feature.get('name')}`,
      fill: new Fill({ color: '#333' }),
      // stroke: new Stroke({ color: outlineColor, width: outlineWidth }),
      stroke: new Stroke({
        color: '#ffffff', // white outline
        width: 2,
      }),
      placement: placement,
      maxAngle: maxAngle,
      overflow: overflow,
      rotation: rotation,
    });
  };

  items = [
    {
      District: 'Wayanad',
      Date1: 0.0,
      Date2: 4.7,
      Date3: 0.7,
      View: './assets/images/icon_view.svg',
    },
    {
      District: 'Thrissur',
      Date1: 0.0,
      Date2: 4.7,
      Date3: 0.7,
      View: './assets/images/icon_view.svg',
    },
    {
      District: 'Tiruananthapuram',
      Date1: 0.0,
      Date2: 4.7,
      Date3: 0.7,
      View: './assets/images/icon_view.svg',
    },
    {
      District: 'Pathanamthitta',
      Date1: 0.0,
      Date2: 4.7,
      Date3: 0.7,
      View: './assets/images/icon_view.svg',
    },
    {
      District: 'Pallakkad',
      Date1: 0.0,
      Date2: 4.7,
      Date3: 0.7,
      View: './assets/images/icon_view.svg',
    },
    {
      District: 'Malapuram',
      Date1: 0.0,
      Date2: 4.7,
      Date3: 0.7,
      View: './assets/images/icon_view.svg',
    },
    {
      District: 'Kozhikode',
      Date1: 0.0,
      Date2: 4.7,
      Date3: 0.7,
      View: './assets/images/icon_view.svg',
    },
    {
      District: 'Kottayam',
      Date1: 0.0,
      Date2: 4.7,
      Date3: 0.7,
      View: './assets/images/icon_view.svg',
    },
    {
      District: 'Kollam',
      Date1: 0.0,
      Date2: 4.7,
      Date3: 0.7,
      View: './assets/images/icon_view.svg',
    },
  ];

  earthQuakes = [
    {
      date: '2024-01-25',
      lsg: 'Adimali',
      depth: '5',
      updateddate: '2025-04-08T00:00:00.000+00:00',
      magnitude: '2.4',
      lsgid: 'LSG0237',
      direction: 'Idukki, Kerala',
    },
    {
      date: '2024-06-15',
      lsg: 'Pavaratty',
      depth: '7',
      updateddate: '2025-04-08T00:00:00.000+00:00',
      magnitude: '3.0',
      lsgid: 'LSG055',
      direction: 'Thrissur, Kerala',
    },
    {
      date: '2024-06-16',
      lsg: 'Erumapetty',
      depth: '10',
      updateddate: '2025-04-08T00:00:00.000+00:00',
      magnitude: '2.9',
      lsgid: 'LSG0737',
      direction: 'Thrissur, Kerala',
    },
  ];

  constructor(
    private renderer: Renderer2,
    private cdr: ChangeDetectorRef,
    public dialog: MatDialog,
    private dialogService: DialogService,
    private router: Router,
    private domSanitizer: DomSanitizer
  ) {}

  getBoundaryStyle = (feature: FeatureLike, resolution: number): Style => {
    return new Style({
      stroke: new Stroke({
        color: 'red',
        width: this.outskirtBoundary,
        // lineDash: [4, 4],
      }),
      fill: new Fill({
        color: 'rgba(0, 0, 255, 0.1)',
      }),
      text: this.createTextStyle(feature, resolution, 'state'),
    });
  };

  getDistrictStyle = (feature: FeatureLike, resolution: number): Style => {
    return new Style({
      stroke: new Stroke({
        color: 'green',
        width: this.outskirtBoundary,
        // lineDash: [4, 4],
      }),
      fill: new Fill({
        color: 'rgba(0, 0, 255, 0.1)',
      }),
      text: this.createTextStyle(feature, resolution, 'district'),
    });
  };

  getTalukStyle = (feature: FeatureLike, resolution: number): Style => {
    return new Style({
      stroke: new Stroke({
        color: 'blue',
        width: this.outskirtBoundary,
        // lineDash: [4, 4],
      }),
      fill: new Fill({
        color: 'rgba(0, 0, 255, 0.1)',
      }),
      text: this.createTextStyle(feature, resolution, 'taluk'),
    });
  };

  getLsgStyle = (feature: FeatureLike, resolution: number): Style => {
    return new Style({
      stroke: new Stroke({
        color: 'purple',
        width: this.outskirtBoundary,
        // lineDash: [4, 4],
      }),
      fill: new Fill({
        color: 'rgba(0, 0, 255, 0.1)',
      }),
      text: this.createTextStyle(feature, resolution, 'lsg'),
    });
  };

  getDisaster2Style = (feature: FeatureLike, resolution: number): Style => {
    return new Style({
      stroke: new Stroke({
        color: 'red',
        width: 2,
        lineDash: [4, 4],
      }),
      fill: new Fill({
        color: 'rgba(0, 0, 255, 0.1)',
      }),
      image: new Icon({
        src: 'assets/images/POI/EOC_Location_solid.png',
        scale: 1,
        anchor: [0.5, 1],
      }),
      text: this.createTextStyleDisaster(feature, resolution, 'state'),
    });
  };

  getRedHazardStyle = (): Style => {
    const zoom: any = this.map.getView().getZoom();
    const scale = zoom / 10;
    const warningIcon = new Icon({
      scale: scale,
      crossOrigin: 'anonymous',
      src: './assets/images/map/redAlert.svg',
      opacity: 0,
    });
    return new Style({
      image: warningIcon,
    });
  };

  getOrangeHazardStyle = (): Style => {
    const zoom: any = this.map.getView().getZoom();
    const scale = zoom / 10;
    const warningIcon = new Icon({
      scale: scale,
      crossOrigin: 'anonymous',
      src: './assets/images/map/orangeAlert.svg',
      opacity: 0,
    });
    return new Style({
      image: warningIcon,
    });
  };

  POIicon!: Icon;
  path!: string;

  getPOIStyle = (feature: any, resolution: any): Style => {
    const zoom: any = this.map.getView().getZoom();

    let scale = 0.2;

    if (zoom > 10) {
      scale = 1.2;
    } else if (zoom > 9) {
      scale = 0.9;
    } else if (zoom > 8) {
      scale = 0.7;
    }

    this.POIicon = new Icon({
      src: this.path,
      scale: scale,
    });
    return new Style({
      image: this.POIicon,
      // text: this.createTextStyle(feature, resolution),
    });
  };

  getDisasterStyle = (feature: any, resolution: any): Style => {
    const zoom: any = this.map.getView().getZoom();
    const scale = zoom / 8;
    this.POIicon = new Icon({
      src: './assets/images/icon_lightning_thunder_solid.png',
      scale: scale,
    });
    return new Style({
      image: this.POIicon,
      // text: this.createTextStyle(feature, resolution),
    });
  };

  reset() {
    this.bankCtrl.reset();
  }

  selectedForecast: any = 'imd';
  sliderControl = new FormControl<number>(100);
  
  formatLabel(value: number | null): string {
    const num = Number(value);
    return isNaN(num) ? '0' : num >= 1000 ? `${num / 1000} %` : `${num} %`;
  }


  formatLabelToOpacity(value: number | null): string {
    const num = Number(value);
    return isNaN(num) ? '0.00' : (num / 100).toFixed(1);
  }

  ngOnInit(): void {
    this.sliderControl.valueChanges.subscribe((value) => {
      console.log('Slider changed to:', value);
      this.handleOpacity(this.formatLabelToOpacity(this.sliderControl.value));
    });

    this.clearAllCacheData();
    this.sharedSubscription = this.sharedObsService.currentData.subscribe(
      (resp) => {
        if (resp != null && resp == 'search') {
          this.openSearch();
        }
      }
    );

    this.sharedSubscription = this.alertObs.currentData.subscribe((resp) => {
      if (resp != null) {
        if (resp === 'openAlert') {
          this.onInitAlertsShowInfoClick();
        }
      }
    });

    const keralaExtent = [
      ...fromLonLat([74.52, 8.07]),
      ...fromLonLat([77.54, 12.99]),
    ];

    this.container = this.renderer.selectRootElement('#popup', true);
    this.content = this.renderer.selectRootElement('#popup-content', true);
    this.closer = this.renderer.selectRootElement('#popup-closer', true);
    this.pinPopup = this.renderer.selectRootElement('#pinPopup', true);
    this.pinPopupContent = this.renderer.selectRootElement(
      '#pin-popup-content',
      true
    );
    this.pinPopupCloser = this.renderer.selectRootElement(
      '#pin-popup-closer',
      true
    );
    // this.weatherMap = this.renderer.selectRootElement('#weather-map', true);
    this.localInsight = this.renderer.selectRootElement('#local-insight', true);
    this.weatherDetail = this.renderer.selectRootElement(
      '#weather-detail',
      true
    );

    const boundarySource = new VectorSource<any>();
    this.boundaryVectorLayer = new VectorImageLayer({
      source: boundarySource,
      style: this.getBoundaryStyle,
      zIndex: 1,
      properties: {
        name: 'stateBoundary',
      },
    });

    const districtBoundarySource = new VectorSource<any>();
    this.districtBoundaryVectorLayer = new VectorImageLayer({
      source: districtBoundarySource,
      style: this.getDistrictStyle,
      zIndex: 2,
      properties: {
        name: 'districtBoundary',
      },
    });

    const talukBoundarySource = new VectorSource<any>();
    this.talukBoundaryVectorLayer = new VectorImageLayer({
      source: talukBoundarySource,
      style: this.getTalukStyle,
      zIndex: 2,
      properties: {
        name: 'talukBoundary',
      },
    });

    const lsgBoundarySource = new VectorSource<any>();
    this.lsgBoundaryVectorLayer = new VectorImageLayer({
      source: lsgBoundarySource,
      style: this.getLsgStyle,
      zIndex: 2,
      properties: {
        name: 'LSGBoundary',
      },
    });

    const redHazardSource = new VectorSource<any>();
    this.redHazardVectorLayer = new VectorLayer({
      source: redHazardSource,
      style: this.getRedHazardStyle,
      zIndex: 3,
      properties: {
        name: 'redHazardLayer',
      },
    });

    const orangeHazardSource = new VectorSource<any>();
    this.orangeHazardVectorLayer = new VectorLayer({
      source: orangeHazardSource,
      style: this.getOrangeHazardStyle,
      zIndex: 4,
      properties: {
        name: 'orangeHazardLayer',
      },
    });

    const poiSource = new VectorSource<any>();
    this.poiVectorLayer = new VectorLayer({
      source: poiSource,
      style: this.getPOIStyle,
      zIndex: 5,
      properties: {
        name: 'poiLayer',
      },
    });

    const pinSource = new VectorSource<any>();
    this.pinVectorLayer = new VectorLayer({
      source: pinSource,
      zIndex: 6,
      properties: {
        name: 'pinVectorLayer',
      },
    });

    const disasterSource = new VectorSource<any>();
    this.disasterVectorLayer = new VectorLayer({
      source: disasterSource,
      style: this.getDisasterStyle,
      zIndex: 7,
      properties: {
        name: 'disasterLayer',
      },
    });

    const disasterSource2 = new VectorSource<any>();
    this.disasterVectorLayer2 = new VectorLayer({
      source: disasterSource2,
      style: this.getDisaster2Style,
      zIndex: 7,
      properties: {
        name: 'disasterLayer2',
      },
    });

    const tempSource = new VectorSource<any>();
    this.tempVectorLayer = new VectorImageLayer({
      source: tempSource,
      zIndex: 8,
      properties: {
        name: 'tempVectorLayer',
      },
    });

    const populationSource = new VectorSource<any>();
    this.populationVectorLayer = new VectorImageLayer({
      source: populationSource,
      zIndex: 8,
      properties: {
        name: 'populationLayer',
      },
    });

    const shelterSource = new VectorSource<any>();
    this.shelterVectorLayer = new VectorLayer({
      source: shelterSource,
      zIndex: 9,
      properties: {
        name: 'shelterLayer',
      },
    });

    const imageSuspectabilitySource = new VectorSource<any>();
    this.susceptibilityVectorImageLayer = new VectorImageLayer({
      source: imageSuspectabilitySource,
      zIndex: 8,
      properties: {
        name: 'suspectabilityLayer',
      },
    });

    const raster = new TileLayer({
      source: new OSM({
        attributions: [
          '© <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors',
        ],
      }),
    });

    this.overlay = new Overlay({
      element: this.container,
      autoPan: {
        animation: {
          duration: 400,
        },
      },
    });

    this.pinOverlay = new Overlay({
      element: this.pinPopup,
      autoPan: {
        animation: {
          duration: 400,
        },
      },
    });

    this.map = new Map({
      target: this.mapElement.nativeElement,
      layers: [
        raster,
        this.boundaryVectorLayer,
        this.redHazardVectorLayer,
        this.orangeHazardVectorLayer,
        this.poiVectorLayer,
        this.pinVectorLayer,
        this.districtBoundaryVectorLayer,
        this.talukBoundaryVectorLayer,
        this.lsgBoundaryVectorLayer,
        this.disasterVectorLayer,
        this.disasterVectorLayer2,
        this.tempVectorLayer,
        this.populationVectorLayer,
        this.shelterVectorLayer,
        this.susceptibilityVectorImageLayer,
      ],
      overlays: [this.overlay, this.pinOverlay],
      view: new View({
        center: fromLonLat([76.2711, 10.8505]),
        zoom: 2,
        maxZoom: 20,
        projection: this.PROJECTION_EPSG_3857,
        extent: keralaExtent,
        constrainOnlyCenter: true,
        constrainResolution: true,
      }),
      controls: defaultControls({ zoom: false, attribution: false }),
    });

    this.map.once('postrender', (event) => {
      this.addBoundaryFeatureInMap();
      this.addDistrictBoundaryInMap();
      this.addTalukBoundaryInMap();
      this.addLsgBoundaryInMap();
      this.addNearbyLsgOfDistrict();
      this.addDistrictNameIntoLocation();
    });

    this.map.on('singleclick', (event) => {
      const clickedCoordinate = toLonLat(event.coordinate);
    });

    this.map.on('moveend', () => {
      const zoom = this.map.getView().getZoom();
      this.checkLayerVisibilityOnZoomLevel(zoom);
    });

    this.makeEveryBoundaryFalse();
    this.addPinEvent();
    this.click();
    // this.cummilativeData();
    this.chatUrlSafe = this.domSanitizer.bypassSecurityTrustResourceUrl(
      this.chatUrl
    );
    //for mobile view
    this.checkScreenSize();
  }

  ngAfterViewInit() {
    this.getGroupDetails();
    this.getDistrictIdAndName();
    this.hideAllScale();
    this.preFeedFloodSusData();
    this.preFeedLandslideData();
  }

  @HostListener('window:resize', [])
  onResize() {
    this.checkScreenSize();
  }

  maximizeScreen() {
    const elem = document.documentElement;
    if (elem.requestFullscreen) {
      elem.requestFullscreen();
    } else if ((elem as any).mozRequestFullScreen) {
      (elem as any).mozRequestFullScreen();
    } else if ((elem as any).webkitRequestFullscreen) {
      (elem as any).webkitRequestFullscreen();
    } else if ((elem as any).msRequestFullscreen) {
      (elem as any).msRequestFullscreen();
    }
  }

  handleFullscreenExit = () => {
    if (!document.fullscreenElement) {
      this.maximizeScreen();
    }
  };

  minimizeScreen() {
    if (document.exitFullscreen) {
      document.exitFullscreen();
    } else if ((document as any).mozCancelFullScreen) {
      (document as any).mozCancelFullScreen();
    } else if ((document as any).webkitExitFullscreen) {
      (document as any).webkitExitFullscreen();
    } else if ((document as any).msExitFullscreen) {
      (document as any).msExitFullscreen();
    }
  }

  checkLayerVisibilityOnZoomLevel(zoom: any) {
    if (zoom! <= 7) {
      this.makeEveryBoundaryFalse();
      this.boundaryVectorLayer.setVisible(true);
    } else if (zoom! >= 8 && zoom! < 10) {
      this.makeEveryBoundaryFalse();
      this.districtBoundaryVectorLayer.setVisible(true);
    } else if (zoom! >= 10 && zoom! < 12) {
      this.makeEveryBoundaryFalse();
      this.talukBoundaryVectorLayer.setVisible(true);
    } else if (zoom! >= 12) {
      this.makeEveryBoundaryFalse();
      this.lsgBoundaryVectorLayer.setVisible(true);
    }
  }

  async preFeedFloodSusData() {
    const cacheKey = 'flood-susceptibility';
    const cachedData = await this.cacheDataService.getData(cacheKey);
    if (!cachedData) {
      this.http
        .get('/assets/Flood_Susceptibility.json.fgz', {
          responseType: 'arraybuffer',
        })
        .subscribe((compressed: ArrayBuffer) => {
          const decompressedString = inflate(new Uint8Array(compressed), {
            to: 'string',
          });
          const geojsonData = JSON.parse(decompressedString);
          this.cacheDataService.storeData(cacheKey, geojsonData);
        });
    }
  }

  async preFeedLandslideData() {
    const cacheKey = 'land-susceptibility';
    const cachedData = await this.cacheDataService.getData(cacheKey);
    if (!cachedData) {
      this.http
        .get('/assets/Landslide_Prone_NCESS_Susceptibility.json.fgz', {
          responseType: 'arraybuffer',
        })
        .subscribe((compressed: ArrayBuffer) => {
          const decompressedString = inflate(new Uint8Array(compressed), {
            to: 'string',
          });
          const geojsonData = JSON.parse(decompressedString);
          this.cacheDataService.storeData(cacheKey, geojsonData);
        });
    }
  }

  addDistrictNameIntoLocation() {
    this.http
      .get<any[]>('assets/id_and_district_name.json')
      .subscribe((response) => {
        const allItem = response.find((item) => item.id === 0);

        const sortedLocations = response
          .filter((item) => item.id !== 0 && item.name)
          .sort((a, b) => a.name.localeCompare(b.name));

        this.locations = allItem
          ? [allItem, ...sortedLocations]
          : sortedLocations;
      });
  }

  nearByDistrictLsg: any = [];
  addNearbyLsgOfDistrict() {
    this.http.get<any[]>('assets/ocean-lsgs.json').subscribe((response) => {
      this.nearByDistrictLsg = response;
    });
  }

  makeEveryBoundaryFalse() {
    this.boundaryVectorLayer.setVisible(false);
    this.districtBoundaryVectorLayer.setVisible(false);
    this.talukBoundaryVectorLayer.setVisible(false);
    this.lsgBoundaryVectorLayer.setVisible(false);

    // this.redHazardVectorLayer.setVisible(false);
    // this.orangeHazardVectorLayer.setVisible(false);
    // this.poiVectorLayer.setVisible(false);
    // this.pinVectorLayer.setVisible(false);

    // this.disasterVectorLayer.setVisible(false);
    // this.disasterVectorLayer2.setVisible(false);

    // this.tempVectorLayer.setVisible(false);
    // this.populationVectorLayer.setVisible(false);
    // this.shelterVectorLayer.setVisible(false);
    // this.susceptibilityVectorImageLayer.setVisible(false);
  }

  enablePinning(): void {
    this.popupCloser();
    this.removePoiOverlay();
    this.removeSuspectabilityImageVectorSource();
    this.removeTempVectorLayer();
    if (this.isPinning) {
      this.resetCursor();
      this.isPinning = false;
    } else {
      this.removePin();
      this.pinOverlay.setPosition(undefined);
      this.isPinning = true;
      this.changeCursorToIcon();
    }
  }

  addPin(coordinate: number[]): void {
    const lonLat = toLonLat(coordinate);
    const pin = new Feature({
      geometry: new Point(coordinate),
    });
    pin.setProperties({
      category: 'pinPoint',
    });

    pin.setStyle(
      new Style({
        image: new Icon({
          anchor: [0.5, 1],
          scale: 1.0,
          src: 'https://upload.wikimedia.org/wikipedia/commons/e/ec/RedDot.svg',
        }),
      })
    );

    const source: VectorSource = this.pinVectorLayer.getSource();
    source.clear();
    source!.addFeature(pin);
    this.isPinning = false;
  }

  removePin() {
    const source: VectorSource = this.pinVectorLayer.getSource();
    source.clear();
    this.isPinning = false;
  }

  createRedHazardOverlayElement(): HTMLElement {
    // const div = document.createElement('div');
    // div.className = 'rippleRed';
    // return div;
    const img = document.createElement('img');
    img.src = 'assets/images/redAlert.svg';
    img.style.width = '32px';
    img.style.height = '32px';
    img.style.transform = 'translate(-50%, -50%)';
    return img;
  }

  createOrangeHazardOverlayElement(): HTMLElement {
    // const div = document.createElement('div');
    // div.className = 'rippleOrange';
    // return div;

    const img = document.createElement('img');
    img.src = 'assets/images/orangeAlert.svg';
    img.style.width = '32px';
    img.style.height = '32px';
    img.style.transform = 'translate(-50%, -50%)';
    return img;
  }

  ngOnDestroy(): void {
    if (this.sharedSubscription) {
      this.sharedSubscription.unsubscribe();
    }
  }

  getLast24HourRange(): { fromDate: string; toDate: string } {
    const toDateObj = new Date();
    const fromDateObj = new Date(toDateObj.getTime() - 24 * 60 * 60 * 1000); // 24 hours ago

    const formatDateTime = (date: Date): string => {
      const year = date.getFullYear();
      const month = this.padZero(date.getMonth() + 1);
      const day = this.padZero(date.getDate());
      const hours = this.padZero(date.getHours());
      const minutes = this.padZero(date.getMinutes());
      const seconds = this.padZero(date.getSeconds());
      return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    };

    return {
      fromDate: formatDateTime(fromDateObj),
      toDate: formatDateTime(toDateObj),
    };
  }

  private padZero(num: number): string {
    return num < 10 ? `0${num}` : `${num}`;
  }

  private http = inject(HttpClient);
  private rangeService = inject(RangeService);

  polygon3857: number[][] = [];
  addBoundaryFeatureInMap() {
    try {
      this.http
        .get<any[]>('assets/state-boundary.json')
        .subscribe((response) => {
          this.polygon3857 = response.map((coord) =>
            transform(
              coord,
              this.PROJECTION_EPSG_4326,
              this.PROJECTION_EPSG_3857
            )
          );
          const keralaPolygon = new Feature({
            name: 'Kerala',
            category: 'stateBoundary',
            geometry: new Polygon([this.polygon3857]),
          });
          const source: VectorSource = this.boundaryVectorLayer.getSource();
          source!.addFeature(keralaPolygon);
          const view = this.map.getView();
          this.zoomToFeature(view, source.getExtent());
        });
    } catch (error) {
      alert('Something went wrong!');
      console.error(error);
    }
  }

  allDistrictBoundaryData: any[] = [];
  addDistrictBoundaryInMap() {
    try {
      this.http
        .get<any>('assets/district-boundaries.json')
        .subscribe((response) => {
          if (response.length > 0) {
            this.allDistrictBoundaryData = response;
            let features: Array<Feature> = [];
            for (let i = 0; i < response.length; i++) {
              const feature = response[i];
              const coords = feature.geometry.coordinates[0];
              const poly3857 = coords.map((coord: any) =>
                transform(
                  coord,
                  this.PROJECTION_EPSG_4326,
                  this.PROJECTION_EPSG_3857
                )
              );
              let districtFeature: Feature = new Feature({
                name: feature.properties.districtname,
                category: 'districtBoundary',
                geometry: new Polygon([poly3857]),
              });

              features.push(districtFeature);
            }
            const source: VectorSource =
              this.districtBoundaryVectorLayer.getSource();
            source!.addFeatures(features);
          }
        });
    } catch (error) {
      alert('Something went wrong!');
      console.error(error);
    }
  }

  addTalukBoundaryInMap() {
    try {
      this.http
        .get<any>('assets/taluk-boundaries.json')
        .subscribe((response) => {
          if (response.length > 0) {
            let features: Array<Feature> = [];
            for (let i = 0; i < response.length; i++) {
              const feature = response[i];
              const coords = feature.geometry.coordinates[0];
              const poly3857 = coords.map((coord: any) =>
                transform(
                  coord,
                  this.PROJECTION_EPSG_4326,
                  this.PROJECTION_EPSG_3857
                )
              );
              let talukFeature: Feature = new Feature({
                name: feature.properties.talukname,
                category: 'talukBoundary',
                geometry: new Polygon([poly3857]),
              });

              features.push(talukFeature);
            }
            const source: VectorSource =
              this.talukBoundaryVectorLayer.getSource();
            source!.addFeatures(features);
          }
        });
    } catch (error) {
      console.error(error);
      alert('Something went wrong!');
    }
  }

  allLsgBoundaryData: any[] = [];
  addLsgBoundaryInMap() {
    try {
      this.http.get<any>('assets/lsg-boundaries.json').subscribe((response) => {
        if (response.length > 0) {
          this.allLsgBoundaryData = response;
          let features: Array<Feature> = [];
          for (let i = 0; i < response.length; i++) {
            const feature = response[i];
            const coords = feature.geometry.coordinates[0];
            const poly3857 = coords.map((coord: any) =>
              transform(
                coord,
                this.PROJECTION_EPSG_4326,
                this.PROJECTION_EPSG_3857
              )
            );
            let lsgFeature: Feature = new Feature({
              name: feature.properties.name,
              category: 'lsgBoundary',
              geometry: new Polygon([poly3857]),
            });
            features.push(lsgFeature);
          }
          const source: VectorSource = this.lsgBoundaryVectorLayer.getSource();
          source!.addFeatures(features);
        }
      });
    } catch (error) {
      console.error(error);
      alert('Something went wrong!');
    }
  }

  zoomToFeature(view: View, extent: Extent): void {
    view.fit(extent, {
      duration: this.zoomDuration,
      padding: [50, 50, 50, 50],
      maxZoom: this.featureMaxZoom,
    });
  }

  zoomOut() {
    const extent = [
      8333960.617555198, 926142.6638811225, 8617588.653840631,
      1436252.1723806032,
    ];
    const view = this.map.getView();
    view.fit(extent, {
      duration: this.zoomDuration,
      padding: [50, 50, 50, 50],
      maxZoom: this.featureMaxZoom,
    });
  }

  returnToOriginalMap() {
    this.onPOIcloseClick();
    this.onAlertsCloseClick();
    this.onHazzardsCloseClick();
    this.hideWeatherSelection();
    this.hideAllScale();
    this.popupCloser();
    this.removePoiOverlay();
    this.pinPopupClose();
    this.resetCursor();
    this.removeDisasterInMap();
    this.removeTempVectorLayer();
    this.removeRedOrangeHazardOverlay();
    this.removeSuspectabilityImageVectorSource();
    this.layerSubject.next([]);

    const extent = [
      8333960.617555198, 926142.6638811225, 8617588.653840631,
      1436252.1723806032,
    ];
    const view = this.map.getView();
    view.fit(extent, {
      duration: this.zoomDuration,
      padding: [50, 50, 50, 50],
      maxZoom: this.featureMaxZoom,
    });
  }

  forecast = [
    { day: 'MON', temp: 29, icon: 'wb_cloudy' },
    { day: 'TUE', temp: 26, icon: 'cloud' },
    { day: 'WED', temp: 24, icon: 'wb_sunny' },
    { day: 'THU', temp: 23, icon: 'nights_stay' },
  ];

  addPinEvent() {
    this.map.on('click', (event) => {
      if (this.isPinning) {
        const clickedCoord = event.coordinate;
        let boundaryPolygon = new Polygon([this.polygon3857]);
        if (boundaryPolygon.intersectsCoordinate(clickedCoord)) {
          this.addPin(event.coordinate);
          this.resetCursor();
        } else {
          alert('Pin cannot be placed outside the boundary!');
        }
      }
    });
  }

  changeCursorToIcon(): void {
    const mapElement = document.getElementById('map');
    if (mapElement) {
      this.renderer.setStyle(
        mapElement,
        'cursor',
        'url(https://upload.wikimedia.org/wikipedia/commons/e/ec/RedDot.svg) 12 12, auto'
      );
    }
  }

  resetCursor(): void {
    const mapElement = document.getElementById('map');
    if (mapElement) {
      this.renderer.setStyle(mapElement, 'cursor', 'default');
    }
  }

  click() {
    this.map.on('singleclick', (event) => {
      this.map.forEachFeatureAtPixel(event.pixel, (feature) => {
        this.popup(feature);
      });
    });
  }

  lsgName!: string;
  message!: string;
  phoneNumber!: string;
  timings!: string;
  noofbeds!: string;
  noofrooms!: string;
  camptype!: string;
  capacity!: string;
  rooms!: string;
  toilets!: string;
  cat!: string;
  storage!: string;
  schoolcode!: string;
  schoolcategory!: string;
  totalclassroom!: string;
  totalpopulation!: string;
  menpopulation!: string;
  womenpopulation!: string;
  childrenpopulation!: string;
  startdate!: string;
  time!: string;
  date!: string;
  depth!: string;
  magnitude!: string;
  direction!: string;

  // handle opacity ============================================================

  opacitySection: boolean = false;

  opacityValue: number = 1;
  fieldName: string = '';

  handleOpacity(opacityInfo: any) {
    if (this.fieldName === 'population') {
      this.opacityValue = opacityInfo;
      this.populationVectorLayer.changed();
      this.cdr.detectChanges();
    } else if (this.fieldName === 'landslide' || this.fieldName === 'flood') {
      this.opacityValue = opacityInfo;
      this.susceptibilityVectorImageLayer.changed();
      this.cdr.detectChanges();
    } else if (this.fieldName === 'forecast' || this.fieldName === 'actual') {
      this.opacityValue = opacityInfo;
      this.tempVectorLayer.changed();
      this.cdr.detectChanges();
    }

    console.log(this.opacityValue, 'opacityValue');
  }

  closeOpacitySection() {
    this.opacitySection = false;
  }

  // ===========================================================================

  popup(feature: any) {
    const featureValue = feature.getProperties();
    // this.clearPopUpData();
    if (featureValue) {
      if (
        featureValue.category === 'stateBoundary' ||
        featureValue.category === 'districtBoundary' ||
        featureValue.category === 'talukBoundary' ||
        featureValue.category === 'lsgBoundary'
      ) {
        // console.log('boundaries');
      }
      if (featureValue.category === 'POI') {
        this.insertPOIPopup(featureValue);
      } else if (featureValue.category === 'pinPoint') {
        this.createIncidetPopup(featureValue);
      } else if (featureValue.category === 'Disaster') {
        // console.log(featureValue, 'dis');
      } else if (featureValue.category === 'DisasterBoundary') {
        this.showDisasterMessagePopup(featureValue);
      } else if (featureValue.category === 'EarthQuakeDisasterBoundary') {
        this.showEarthQuakeDisasterMessagePopup(featureValue);
      }
    }
    // if (featureValue.name === 'pinPoint') {
    //   this.createIncidetPopup(featureValue);
    // } else if (geometry.getType() === 'Point' && Array.isArray(geometry.getFlatCoordinates()) && geometry.getFlatCoordinates().length === 2) {
    //   this.updatePopUpContent(featureValue);
    // }
  }

  showDisasterMessagePopup(featureValue: any) {
    this.poiName = featureValue.name;
    this.message = featureValue.message;
    this.cdr.detectChanges();
    const coordinates = featureValue.geometry.flatCoordinates;
    const lonLat = this.transformCoordinates(coordinates[0], coordinates[1]);
    let lat = lonLat[0];
    let lon = lonLat[1];
    const olCoordinates = olProj.fromLonLat([lat, lon]);
    this.overlay.setPosition(olCoordinates);
  }

  showEarthQuakeDisasterMessagePopup(featureValue: any) {
    this.lsgName = featureValue.name;
    this.date = featureValue.date;
    this.depth = featureValue.depth;
    this.magnitude = featureValue.magnitude;
    this.direction = featureValue.direction;

    this.cdr.detectChanges();
    const coordinates = featureValue.geometry.flatCoordinates;
    const lonLat = this.transformCoordinates(coordinates[0], coordinates[1]);
    let lat = lonLat[0];
    let lon = lonLat[1];
    const olCoordinates = olProj.fromLonLat([lat, lon]);
    this.overlay.setPosition(olCoordinates);
  }

  insertPOIPopup(featureValue: any) {
    if (featureValue.dataid === POIConstant.POI_HELIPAD) {
      this.poiName = featureValue.name;
      this.lsgName = featureValue.lsg;
      this.updatePopUpContent(featureValue);
    } else if (featureValue.dataid === POIConstant.POI_DISCHARGE_GUAGE) {
      this.poiName = featureValue.name;
      this.lsgName = featureValue.lsg;
      this.updatePopUpContent(featureValue);
    } else if (featureValue.dataid === POIConstant.POI_RELIEF_CAMPS) {
      this.poiName = featureValue.name;
      this.lsgName = featureValue.lsg;
      this.camptype = featureValue.camptype;
      this.capacity = featureValue.capacity;
      this.rooms = featureValue.rooms;
      this.toilets = featureValue.toilets;
      this.updatePopUpContent(featureValue);
    } else if (featureValue.dataid === POIConstant.POI_PRIVATE_HOSPITAL) {
      console.log('private hosp');
    } else if (featureValue.dataid === POIConstant.POI_DAMS) {
      this.poiName = featureValue.name;
      this.lsgName = featureValue.lsg;
      this.cat = featureValue.cat;
      this.storage = featureValue.storage;
      this.updatePopUpContent(featureValue);
    } else if (featureValue.dataid === POIConstant.POI_SCHOOLS) {
      this.poiName = featureValue.name;
      this.lsgName = featureValue.lsg;
      this.schoolcode = featureValue.schoolcode;
      this.schoolcategory = featureValue.schoolcategory;
      this.totalclassroom = featureValue.totalclassroom;
      this.updatePopUpContent(featureValue);
    } else if (featureValue.dataid === POIConstant.POI_PLACE_NAMES) {
      console.log('place names');
    } else if (featureValue.dataid === POIConstant.POI_OTHER_COVID_HOSPITALS) {
      console.log('other covid hosp');
    } else if (featureValue.dataid === POIConstant.POI_SHELTERS) {
      this.poiName = featureValue.name;
      this.lsgName = featureValue.lsg;
      this.noofrooms = featureValue.norooms;
      this.phoneNumber = featureValue.phno;
      this.updatePopUpContent(featureValue);
    } else if (featureValue.dataid === POIConstant.POI_HOTELS) {
      this.poiName = featureValue.name;
      this.lsgName = featureValue.lsg;
      this.phoneNumber = featureValue.phoneno;
      this.timings = featureValue.timings;
      this.updatePopUpContent(featureValue);
    } else if (featureValue.dataid === POIConstant.POI_BUS_STATION) {
      this.poiName = featureValue.name;
      this.lsgName = featureValue.lsg;
      this.updatePopUpContent(featureValue);
    } else if (featureValue.dataid === POIConstant.POI_FIRE_STATION) {
      this.poiName = featureValue.name;
      this.lsgName = featureValue.lsg;
      this.phoneNumber = featureValue.phoneno;
      this.timings = featureValue.timings;
      this.updatePopUpContent(featureValue);
    } else if (featureValue.dataid === POIConstant.POI_GROCERY_STORE) {
      this.poiName = featureValue.name;
      this.lsgName = featureValue.lsg;
      this.updatePopUpContent(featureValue);
    } else if (featureValue.dataid === POIConstant.POI_HOSPITAL) {
      this.poiName = featureValue.name;
      this.lsgName = featureValue.lsg;
      // this.phoneNumber = featureValue.phoneno;
      this.timings = featureValue.timings;
      this.noofbeds = featureValue.noofbeds;
      this.noofrooms = featureValue.noofrooms;
      this.updatePopUpContent(featureValue);
    } else if (featureValue.dataid === POIConstant.POI_DISTRICT) {
      console.log('dist');
    } else if (featureValue.dataid === POIConstant.POI_VLOUNTEER) {
      this.poiName = featureValue.name;
      this.lsgName = featureValue.lsg;
      this.phoneNumber = featureValue.phnumber;
      this.updatePopUpContent(featureValue);
    } else if (featureValue.dataid === POIConstant.POI_WATER_KIOSK) {
      this.poiName = featureValue.name;
      this.lsgName = featureValue.lsg;
      this.updatePopUpContent(featureValue);
      console.log('water kiosk');
    } else if (featureValue.dataid === POIConstant.POI_EOC_LOCATION) {
      this.poiName = featureValue.name;
      this.updatePopUpContent(featureValue);
      console.log('eoc');
    } else if (featureValue.dataid === POIConstant.POI_HAZARDIOUS_LOCATION) {
      this.poiName = featureValue.name;
      this.lsgName = featureValue.lsg;
      this.updatePopUpContent(featureValue);
      console.log('haz loc');
    } else if (featureValue.dataid === POIConstant.POI_MATSYA_BHAVAN) {
      this.poiName = featureValue.name;
      this.updatePopUpContent(featureValue);
    } else if (featureValue.dataid === POIConstant.POI_LSG) {
      console.log('lsg');
    } else if (featureValue.dataid === POIConstant.POI_PHQ) {
      this.poiName = featureValue.name;
      this.updatePopUpContent(featureValue);
    } else if (featureValue.dataid === POIConstant.POI_ROAD_CLOSURES) {
      this.poiName = featureValue.name;
      this.lsgName = featureValue.lsg;
      this.startdate = featureValue.startdate;
      this.time = featureValue.time;
      this.updatePopUpContent(featureValue);
    } else if (featureValue.dataid === POIConstant.POI_POLICE_STATIONS) {
      this.poiName = featureValue.name;
      this.lsgName = featureValue.lsg;
      // this.phoneNumber = featureValue.phoneno;
      this.timings = featureValue.timings;
      this.updatePopUpContent(featureValue);
    } else if (featureValue.dataid === POIConstant.POI_CRITICAL_INFRA) {
      this.poiName = featureValue.name;
      this.lsgName = featureValue.lsg;
      this.updatePopUpContent(featureValue);
    } else if (featureValue.dataid === POIConstant.POI_TALUK_INFORMATION) {
      this.poiName = featureValue.name;
      this.lsgName = featureValue.lsg;
      this.totalpopulation = featureValue.totalpopulation;
      this.menpopulation = featureValue.men;
      this.womenpopulation = featureValue.women;
      this.childrenpopulation = featureValue.children;
      this.updatePopUpContent(featureValue);
    } else if (featureValue.dataid === POIConstant.POI_JUNCTIONS) {
      this.poiName = featureValue.name;
      this.lsgName = featureValue.lsg;
      this.updatePopUpContent(featureValue);
      console.log('junct');
    } else if (featureValue.dataid === POIConstant.POI_TALUK) {
      console.log('taluk');
    } else if (featureValue.dataid === POIConstant.POI_AUDITORIUMS) {
      console.log('audi');
    } else if (featureValue.dataid === POIConstant.POI_LSG_POPULATION) {
      this.poiName = featureValue.name;
      this.lsgName = featureValue.lsg;
      this.totalpopulation = featureValue.totalpopulation;
      this.menpopulation = featureValue.men;
      this.womenpopulation = featureValue.women;
      this.childrenpopulation = featureValue.children;
      this.updatePopUpContent(featureValue);
    } else if (featureValue.dataid === POIConstant.POI_DISTRICT_POPULATION) {
      this.poiName = featureValue.name;
      this.lsgName = featureValue.lsg;
      this.totalpopulation = featureValue.totalpopulation;
      this.menpopulation = featureValue.men;
      this.womenpopulation = featureValue.women;
      this.childrenpopulation = featureValue.children;
      this.updatePopUpContent(featureValue);
    }
  }

  clearPopUpData() {
    this.poiName = '';
    (this.message = ''), (this.lsgName = '');
    this.phoneNumber = '';
    this.timings = '';
    this.noofbeds = '';
    this.noofrooms = '';
    this.camptype = '';
    this.capacity = '';
    this.rooms = '';
    this.toilets = '';
    this.cat = '';
    this.storage = '';
    this.schoolcode = '';
    this.schoolcategory = '';
    this.totalclassroom = '';
    this.totalpopulation = '';
    this.menpopulation = '';
    this.womenpopulation = '';
    this.childrenpopulation = '';
    this.startdate = '';
    this.time = '';
    this.date = '';
    this.depth = '';
    this.magnitude = '';
    this.direction = '';
  }

  latestCoordOfPin: any;

  createIncidetPopup(featureValue: any) {
    const coordinates = featureValue.geometry.flatCoordinates;
    const lonLat = this.transformCoordinates(coordinates[0], coordinates[1]);
    let lat = lonLat[0];
    let lon = lonLat[1];
    const olCoordinates = olProj.fromLonLat([lat, lon]);
    this.pinOverlay.setPosition(olCoordinates);
    this.latestCoordOfPin = olCoordinates;
  }

  pinPopupClose() {
    this.pinOverlay.setPosition(undefined);
    this.removePin();
  }

  poiName!: string;

  updatePopUpContent(featureValue: any) {
    this.poiName = featureValue.name;
    this.cdr.detectChanges();
    const coordinates = featureValue.geometry.flatCoordinates;
    const lonLat = this.transformCoordinates(coordinates[0], coordinates[1]);
    let lat = lonLat[0];
    let lon = lonLat[1];
    const olCoordinates = olProj.fromLonLat([lat, lon]);
    this.overlay.setPosition(olCoordinates);
  }

  removePoiOverlay() {
    const source: VectorSource = this.poiVectorLayer.getSource();
    source!.clear();
    this.overlay.setPosition(undefined);
    this.selectDistrictPOI = false;
    this.selectedShelterLocation = this.locations.find(
      (loc) => loc.name === 'All'
    );
  }

  openCreateIncidentForm() {
    this.pinPopupClose();
    let dataOfpin: any;
    if (this.latestCoordOfPin != null) {
      dataOfpin = this.latestCoordOfPin;
    } else {
      dataOfpin = null;
    }
    this.raiseIncidentReference = this.dialog.open(RaiseIncidentsComponent, {
      autoFocus: false,
      data: dataOfpin,
      disableClose: true,
      width: '100px',
    });
    this.dialogSubscription = this.dialogService.dataObservable$.subscribe(
      (result) => {
        if (result) {
        }
      }
    );
  }

  showChatWindow() {
    this.chatWindow = true;
  }

  onPOIMoreClick() {
    // this.hidePOIsMore = false;
    this.hidePOIs = false;
    this.hidePOIall = true;
  }
  onPOIsCloseClick() {
    this.hidePOIall = false;
  }
  onCloseClick() {
    this.hideWeather = false;
  }
  onWetherClick() {
    this.hideWeather = true;
  }
  onHazzardsHover() {
    this.hideHazzardsMore = true;
    this.popupCloser();
  }
  onHazzardsMoreClick() {
    this.hideHazzardsMore = false;
    this.hideAlerts = false;
    this.hideHazzardsAll = true;
  }
  onHazzardsCloseClick() {
    this.hideAlerts = true;
    this.hideHazzardsAll = false;
  }
  onAlertPopupClick() {
    this.hideAlertPopup = false;
  }
  onHazzardInfoShowClick() {
    this.hideAlertPopup = true;
  }
  onAlertsCloseClick() {
    this.hideAllAlerts = false;
  }

  onShowAllAlertsClick() {
    this.getAllDistrictAlert();
    // this.hideAllAlerts = true;
  }

  closeAllHideAlerts() {
    this.hideAlertsInfo = false;
    this.uniqueAlerts = [];
    this.rangeValue = 0;
    this.hideAllScale();
    this.clearRedOrangeHazardOverlay();
  }

  onPOIcloseClick() {
    this.hidePOIs = false;
  }
  onPOIshowClick() {
    this.popupCloser();
    this.hidePOIs = true;
  }

  onShelterInfoCloseClick() {
    this.hideShelterInfo = false;
    this.clearRedOrangeHazardOverlay();
  }

  selectedDistrict = '';

  onShelterInfoOpenClick(districtName: string) {
    this.selectedDistrict = districtName;
    this.cdr.detectChanges();
    let district = this.districtIdAndName.find(
      (data: any) => data.name === districtName
    );
    if (district) {
      this.getShelterDetails(district.id);
      this.hideShelterInfo = false;
      this.hideAlertsInfo = false;
      this.hideSearchInfo = true;
    } else {
      this.hideSearchInfo = false;
      alert('Please try later');
    }
  }

  onSearchInfoCloseClick() {
    this.removeShelterVectorlayer();
    this.shelterInfoOfDistrict = [];
    this.hideSearchInfo = false;
  }

  onShowCalendarClick() {
    this.hideWeatherCalendar = true;
    this.hideWeather = false;
  }
  onSetDateClick() {
    this.hideWeatherCalendar = false;
  }

  openSearch() {
    if (this.hideSearchInfo == true) {
      this.hideSearchInfo = false;
    } else {
      this.hideSearchInfo = true;
    }
  }

  transformCoordinates(x: number, y: number): any {
    return olProj.transform([x, y], 'EPSG:3857', 'EPSG:4326');
  }

  popupCloser() {
    this.overlay.setPosition(undefined);
  }

  weathers: Weather[] = [
    { value: 'Weather Forecast', icon: null, viewValue: 'Weather Forecast' },
    { value: 'Actual Weather', icon: null, viewValue: 'Actual Weather' },
  ];

  locals: Local[] = [
    {
      value: 'steak-0',
      icon: '../../../assets/images/localInsideIcon/rainy.svg',
      viewValue: 'Alappuzha',
    },
    {
      value: 'pizza-1',
      icon: '../../../assets/images/localInsideIcon/cloud-lightning.svg',
      viewValue: 'Ernakulam',
    },
    {
      value: 'tacos-2',
      icon: '../../../assets/images/localInsideIcon/cloud.svg',
      viewValue: 'Malappuram',
    },
    {
      value: 'tacos-2',
      icon: '../../../assets/images/localInsideIcon/cloud-snow.svg',
      viewValue: 'Kannur',
    },
  ];

  onInitAlertsShowInfoClick() {
    this.hideAlertsInfo = true;
    this.hideAllAlerts = false;
  }

  shelterInfoOfDistrict: any = [];
  getShelterDetails(districtId: any) {
    try {
      this.alertService.getShelterDetails(districtId).subscribe({
        next: (response) => {
          if (response.resultResponse.data.length > 0) {
            this.shelterInfoOfDistrict = response.resultResponse.data;
            this.cdr.detectChanges();
          } else {
            alert('No Shelter Found');
          }
        },
        error: (err) => {
          console.log(err);
        },
      });
    } catch (error) {
      console.error(error);
      alert('Something went wrong!');
    }
  }

  openInGoogleMaps(latitude: number, longitude: number): void {
    const url = `https://www.google.com/maps?q=${latitude},${longitude}`;
    window.open(url, '_blank');
  }

  particularShelterClicked(shelter: any) {
    const coordinates = fromLonLat([shelter.lon, shelter.lat]);
    const shelterFeature = new Feature({
      geometry: new Point(coordinates),
      data: shelter,
    });

    shelterFeature.setStyle(
      new Style({
        image: new Icon({
          src: './assets/images/icon_lightning_thunder_solid.png',
          scale: 1,
        }),
        text: new Text({
          text: `${shelter.norooms} rooms`,
          font: '12px Calibri,sans-serif',
          fill: new Fill({ color: '#000' }),
          stroke: new Stroke({ color: '#fff', width: 2 }),
          offsetY: -25,
        }),
      })
    );

    const source: VectorSource = this.shelterVectorLayer.getSource();
    source!.clear();
    source!.addFeature(shelterFeature);
    const view = this.map.getView();
    this.zoomToFeature(view, source.getExtent());
  }

  removeShelterVectorlayer() {
    const source = this.shelterVectorLayer.getSource();
    source!.clear();
  }

  getGroupDetails() {
    this.layerIdOfPOIs = [];
    this.http.get<any[]>('assets/poi-layerid.json').subscribe((response) => {
      for (let i of response) {
        this.layerIdOfPOIs.push(i);
      }
      this.cdr.detectChanges();
    });
  }

  getDistrictIdAndName() {
    this.layerIdOfPOIs = [];
    this.http
      .get<any[]>('assets/id_and_district_name.json')
      .subscribe((response) => {
        for (let i of response) {
          this.districtIdAndName.push(i);
        }
        this.cdr.detectChanges();
      });
  }

  fetchPOI(layerId: string) {
    this.hidePOIs = false;
    this.hideAllScale();
    this.popupCloser();
    this.removePoiOverlay();
    this.pinPopupClose();
    this.resetCursor();
    this.removeDisasterInMap();
    this.removeTempVectorLayer();
    this.removeSuspectabilityImageVectorSource();
    this.layerSubject.next([]);
    this.loadPOILayers(layerId)
      .pipe(take(1))
      .subscribe((initialItems) => {
        this.addPOIinMap(initialItems);
        this.layerSubject.next(initialItems);
      });
  }

  poiDataIdAndIconPath: { [key: string]: string } = {
    [POIConstant.POI_HELIPAD]: './assets/images/POI/Helipad_solid.png',
    [POIConstant.POI_DISCHARGE_GUAGE]:
      './assets/images/POI/dischargeGauges_solid.png',
    // [POIConstant.POI_AUDITORIUMS]: "./assets/images/POI/Helipad_solid.png",
    [POIConstant.POI_BUS_STATION]: './assets/images/POI/BusStation_solid.png',
    [POIConstant.POI_CRITICAL_INFRA]:
      './assets/images/POI/Critical_Infra_solid.png',
    [POIConstant.POI_DAMS]: './assets/images/POI/Dams_solid.png',
    // [POIConstant.POI_DISTRICT]: "./assets/images/POI/Population_solid.png",
    [POIConstant.POI_DISTRICT_POPULATION]:
      './assets/images/POI/Population_solid.png',
    [POIConstant.POI_EOC_LOCATION]:
      './assets/images/POI/EOC_Location_solid.png',
    [POIConstant.POI_FIRE_STATION]: './assets/images/POI/FireStation_solid.png',
    [POIConstant.POI_GROCERY_STORE]:
      './assets/images/POI/GrocerryStore_solid.png',
    [POIConstant.POI_HAZARDIOUS_LOCATION]:
      './assets/images/POI/HazardousLocation_solid.png',
    [POIConstant.POI_HOTELS]: './assets/images/POI/Hotels_solid.png',
    [POIConstant.POI_JUNCTIONS]: './assets/images/POI/Junction_solid.png',
    // [POIConstant.POI_LSG]: "./assets/images/POI/Population_solid.png",
    [POIConstant.POI_LSG_POPULATION]:
      './assets/images/POI/Population_solid.png',
    [POIConstant.POI_MATSYA_BHAVAN]:
      './assets/images/POI/MastyaBhavan_solid.png',
    [POIConstant.POI_OTHER_COVID_HOSPITALS]:
      './assets/images/POI/Hospitals_solid.png',
    [POIConstant.POI_PHQ]: './assets/images/POI/PHQ_solid.png',
    [POIConstant.POI_PLACE_NAMES]: './assets/images/POI/Places_solid.png',
    [POIConstant.POI_POLICE_STATIONS]: './assets/images/POI/Police_solid.png',
    [POIConstant.POI_PRIVATE_HOSPITAL]:
      './assets/images/POI/Hospitals_solid.png',
    [POIConstant.POI_HOSPITAL]: './assets/images/POI/Hospitals_solid.png',
    [POIConstant.POI_RELIEF_CAMPS]: './assets/images/POI/reliefCamp_solid.png',
    [POIConstant.POI_ROAD_CLOSURES]:
      './assets/images/POI/RoadClosure_solid.png',
    [POIConstant.POI_ROAD_CLOSURE_LINE]:
      './assets/images/POI/RoadClosure_solid.png',
    [POIConstant.POI_SCHOOLS]: './assets/images/POI/Schools_solid.png',
    [POIConstant.POI_SHELTERS]: './assets/images/POI/Shelter_solid.png',
    // [POIConstant.POI_TALUK]: "./assets/images/POI/Population_solid.png",
    [POIConstant.POI_TALUK_INFORMATION]:
      './assets/images/POI/Population_solid.png',
    [POIConstant.POI_VLOUNTEER]: './assets/images/POI/Volunteer_solid.png',
    [POIConstant.POI_WATER_KIOSK]: './assets/images/POI/waterKiosk_solid.png',
  };

  fetchedPoiData: any[] = [];
  loadPOILayers(layerId: string) {
    try {
      this.reloading = true;
      return this.mapService.getLayerDetails(layerId).pipe(
        switchMap((response: any) => {
          console.log(response?.data)
          this.fetchedPoiData = response.data;
          if (response.status == true) {
            // shelter info
            if (layerId === 'shEWDS_1789') {
              this.selectDistrictPOI = true;
              this.selectedShelterLocation = this.locations.find(
                (loc) => loc.name === 'All'
              );
            } else {
              this.selectDistrictPOI = false;
            }
            if (layerId === 'maEWDS_1821') {
              this.path =
                this.poiDataIdAndIconPath['point_phewds_1820series_747_tab_M'];
            } else {
              this.path = this.poiDataIdAndIconPath[response.data[0].dataid];
            }
            let items = [];
            items = response.data;
            this.reloading = false;
            this.cdr.detectChanges();
            return of(items);
          } else {
            alert('Unable to find any record');
            this.reloading = false;
            this.cdr.detectChanges();
            return of([]);
          }
        }),
        catchError((error: any) => {
          console.error(error);
          this.reloading = false;
          this.cdr.detectChanges();
          return of([]);
        })
      );
    } catch (error) {
      alert('Something went wrong!');
      console.error(error);
      this.reloading = false;
      this.cdr.detectChanges();
      return of([]);
    }
  }

  addPOIinMap(items: Object[]): void {
    try {
      this.onPOIsCloseClick();
      let features: Array<Feature> = [];
      for (let i = 0; i < items.length; i++) {
        let POI: any = items[i];
        let feature: Feature = new Feature({
          name: 'POI',
          geometry: new Point([POI.lon, POI.lat]).transform(
            this.PROJECTION_EPSG_4326,
            this.PROJECTION_EPSG_3857
          ),
        });
        Object.keys(POI).forEach((key) => {
          feature.set(key, POI[key]);
        });
        features.push(feature);
      }
      const source: VectorSource = this.poiVectorLayer.getSource();
      source!.clear();
      source!.addFeatures(features);

      if (items.length > 0) {
        if ('name' in items[0] && items[0].name === 'Shelter Location') {
          const view = this.map.getView();
          this.zoomToFeature(view, source.getExtent());
        }
      }
      this.reloading = false;
      this.cdr.detectChanges();
    } catch (error) {
      alert('Something went wrong!');
      console.error(error);
      this.reloading = false;
      this.cdr.detectChanges();
    }
  }

  getAllDistrictAlert() {
    try {
      this.hideAlertsInfo = false;
      this.uniqueAlerts = [];
      this.hideAllScale();
      this.districtNameData = [];
      this.popupCloser();
      this.removeRedOrangeHazardOverlay();
      this.removeSuspectabilityImageVectorSource();
      this.removeTempVectorLayer();
      this.reloading = true;
      this.cdr.detectChanges();
      let val = this.getLast24HourRange();
      let obj = {
        fromDate: val.fromDate,
        toDate: val.toDate,
      };
      this.alertService.getAlarmDataDistrictWise(obj).subscribe({
        next: (response) => {
          if (response.success == true) {
            if (response.DATA.length > 0) {
              this.cummilativeData(response.DATA);
            } else {
              alert('Data not present');
            }
          } else {
            alert(response.message);
          }
          this.reloading = false;
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error(err);
          this.reloading = false;
          this.cdr.detectChanges();
        },
      });
    } catch (error) {
      alert('Something went wrong!');
      console.error(error);
      this.reloading = false;
      this.cdr.detectChanges();
    }
  }

  redAlertInfo: any[] = [];
  orangeAlertInfo: any[] = [];
  redAlertDistrictNames: any[] = [];
  orangeAlertDistrictNames: any[] = [];
  uniqueAlerts: any[] = [];

  cummilativeData(data: any) {
    this.reloading = true;
    try {
      // this.DATA.length;
      for (let i of data) {
        if (i[1].length != 0) {
          for (let j of i[1]) {
            if (j.priority === 'Red') {
              this.redAlertInfo.push(j);
            } else if (j.priority === 'Orange') {
              this.orangeAlertInfo.push(j);
            }
          }
        }
      }
      this.redAlertDistrictNames = this.getDistinctDistricts(this.redAlertInfo);
      this.orangeAlertDistrictNames = this.getDistinctDistricts(
        this.orangeAlertInfo
      );
      this.hideAllAlerts = true;
      this.cdr.detectChanges();
    } catch (error) {
      alert('Something went wrong!');
      console.error(error);
      this.reloading = false;
      this.cdr.detectChanges();
    }
  }

  getDistinctDistricts(districts: string[]): string[] {
    let distinctdistrictName: any[] = [];
    districts.filter((dist: any) => {
      if (!distinctdistrictName.includes(dist.district)) {
        distinctdistrictName.push(dist.district);
      }
    });
    return distinctdistrictName;
  }

  alertType!: string;

  updateRange(event: Event) {
    const inputElement = event.target as HTMLInputElement;
    this.rangeValue = Number(inputElement.value);
  }

  onAlertsShowInfoClick(alert: any) {
    this.uniqueAlerts = [];
    this.selectedAlert = '';
    this.hideAllScale();
    this.alertRange = true;
    this.popupCloser();
    this.removePoiOverlay();
    this.pinPopupClose();
    this.cdr.detectChanges();
    this.removeDisasterInMap();
    if (alert === 'Red Alert') {
      this.rangeValue = 90;
      this.redAlertInfo.filter((alert: any) => {
        if (!this.uniqueAlerts.includes(alert.alarm_name)) {
          this.uniqueAlerts.push(alert.alarm_name);
        }
      });
    } else if (alert === 'Orange Alert') {
      this.rangeValue = 60;
      this.orangeAlertInfo.filter((alert: any) => {
        if (!this.uniqueAlerts.includes(alert.alarm_name)) {
          this.uniqueAlerts.push(alert.alarm_name);
        }
      });
    }
    this.alertType = alert;
    this.hideAlertsInfo = true;
    this.hideAllAlerts = false;
    this.cdr.detectChanges();
  }

  selectedAlert!: string;
  districtNameData: any[] = [];
  alertsDataOverMap: any[] = [];

  onRedAlertChange() {
    this.removeRedOrangeHazardOverlay();
    this.alertsDataOverMap = [];
    this.districtNameData = [];
    this.redAlertInfo.filter((alert: any) => {
      if (alert.alarm_name === this.selectedAlert) {
        this.alertsDataOverMap.push(alert);
        if (!this.districtNameData.includes(alert.district)) {
          this.districtNameData.push(alert.district);
        }
      }
    });
    if (this.alertsDataOverMap.length > 0) {
      this.addRedHazardsInMap(this.alertsDataOverMap);
    }
  }

  onOrangeAlertChange() {
    this.removeRedOrangeHazardOverlay();
    this.alertsDataOverMap = [];
    this.districtNameData = [];
    this.orangeAlertInfo.filter((alert: any) => {
      if (alert.alarm_name === this.selectedAlert) {
        this.alertsDataOverMap.push(alert);
        if (!this.districtNameData.includes(alert.district)) {
          this.districtNameData.push(alert.district);
        }
      }
    });
    if (this.alertsDataOverMap.length > 0) {
      this.addOrangeHazardsInMap(this.alertsDataOverMap);
    }
  }

  addRedHazardsInMap(alertsDataOverMap: any[]) {
    alertsDataOverMap.forEach((coord) => {
      const redHazardOverlay = new Overlay({
        element: this.createRedHazardOverlayElement(),
        positioning: 'center-center',
      });
      redHazardOverlay.setPosition(
        fromLonLat([coord.longitude, coord.latitude])
      );
      redHazardOverlay.set('name', 'redHazard');
      this.map.addOverlay(redHazardOverlay);
    });
  }

  addOrangeHazardsInMap(alertsDataOverMap: any[]) {
    alertsDataOverMap.forEach((coord) => {
      const orangeHazardOverlay = new Overlay({
        element: this.createOrangeHazardOverlayElement(),
        positioning: 'center-center',
      });
      orangeHazardOverlay.setPosition(
        fromLonLat([coord.longitude, coord.latitude])
      );
      orangeHazardOverlay.set('name', 'orangeHazard');
      this.map.addOverlay(orangeHazardOverlay);
      const position = fromLonLat([coord.longitude, coord.latitude]);
      this.map.getView().setCenter(position);
      this.map.getView().setZoom(10);
    });
  }

  removeRedOrangeHazardOverlay() {
    const overlays = this.map.getOverlays().getArray();
    overlays
      .filter((overlay) => overlay.get('name') === 'redHazard')
      .forEach((overlay) => this.map.removeOverlay(overlay));
    overlays
      .filter((overlay) => overlay.get('name') === 'orangeHazard')
      .forEach((overlay) => this.map.removeOverlay(overlay));
  }

  clearRedOrangeHazardOverlay() {
    this.removeRedOrangeHazardOverlay();
  }

  getHazardData(hazardType: string) {
    this.removeDisasterInMap();
    this.hideAllScale();
    this.closeAllHideAlerts();
    this.popupCloser();
    this.removePoiOverlay();
    this.resetCursor();
    this.pinPopupClose();
    this.removeDisasterInMap();
    this.removeTempVectorLayer();
    this.removeSuspectabilityImageVectorSource();
    this.reloading = true;
    if (hazardType === 'Flood') {
      alert('Data not present');
      this.reloading = false;
    } else if (hazardType === 'Drought') {
      this.getDraughtData();
    } else if (hazardType === 'Earthquake') {
      this.getEarthQuakeData();
    } else if (hazardType === 'Tsunami') {
      alert('Data not present');
      this.reloading = false;
    } else if (hazardType === 'OceanState') {
      this.getOceanData(hazardType);
    } else if (hazardType === 'SwellSurge') {
      this.getSwellSurgeData(hazardType);
    } else if (hazardType === 'HighTide') {
      this.getHighWaveTidesData(hazardType);
    } else if (hazardType === 'LowTide') {
      this.getLowWaveTidesData(hazardType);
    } else if (hazardType === 'Cyclone') {
      this.getCycloneData(hazardType);
    } else if (hazardType === 'Thunder') {
      this.getThunderData(hazardType);
    } else if (hazardType === 'Lightning') {
      this.getLighteningData(hazardType);
    } else {
      console.error('Invalid HazardType');
      this.reloading = false;
      return;
    }
  }

  getDraughtData() {
    this.reloading = true;
    this.cdr.detectChanges();
    try {
      let val = this.getLast24HourRange();
      let obj = {
        fromDate: val.fromDate,
        toDate: val.toDate,
        vendor: 'imd_aws',
      };
      this.alertService.getDraughtData(obj).subscribe({
        next: (response) => {
          if (response.status === true) {
            if (response.data.length > 0) {
              let filteredData = response.data.filter(
                (item: any) => item.week && item.week === '1W'
              );
              if (filteredData.length > 0) {
                const colorAddedJson = filteredData.map((item: any) => {
                  const color = this.rangeService.getColorForDroughtDrySpell(
                    item?.dryspell
                  );
                  return { ...item, color };
                });
                this.putDroughtDataIntoMap(colorAddedJson);
              } else {
                alert('No 1 Week Data Present');
              }
            } else {
              this.opacitySection = false;
              alert('Data not present');
            }
          } else {
            alert(response.message);
          }
          this.reloading = false;
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error(err);
          this.reloading = false;
        },
      });
    } catch (error) {
      console.error(error);
      alert('Something went wrong!');
      this.reloading = false;
      this.cdr.detectChanges();
    }
  }

  putDroughtDataIntoMap(filteredData: any) {
    this.reloading = true;
    this.cdr.detectChanges();
    try {
      let droughtDataOnLsg: any = [];
      filteredData.forEach((item: any) => {
        const match = this.allLsgBoundaryData.find(
          (item2: any) =>
            item2.properties.lsgid.toLowerCase() === item.lsgid.toLowerCase()
        );
        if (match) {
          droughtDataOnLsg.push({
            ...item,
            coordinates: match.geometry.coordinates[0],
          });
        }
      });
      let features: Array<Feature> = [];
      for (let i = 0; i < droughtDataOnLsg.length; i++) {
        const feature = droughtDataOnLsg[i];
        const coords = feature.coordinates;
        const poly3857 = coords.map((coord: any) =>
          transform(coord, this.PROJECTION_EPSG_4326, this.PROJECTION_EPSG_3857)
        );

        let tempFeature: Feature = new Feature({
          name: feature.lsgname,
          message: feature.message,
          dryspell: feature.rainfall_deviation,
          color: feature.color,
          category: 'tempLsgBoundary',
          geometry: new Polygon([poly3857]),
        });

        const align = 'center';
        const baseline = 'middle';
        const size = '10px';
        const height = '1';
        const weight = 'bold';
        const placement = 'point';
        const maxAngle = 45;
        const overflow = true;
        const rotation = 0;
        const font = weight + ' ' + size + '/' + height + ' ' + 'Courier New';
        const fillColor = 'black';
        const outlineColor = 'white';
        const outlineWidth = 2;

        tempFeature.setStyle((feature, resolution) => {
          const zoom = Math.round(Math.log2(156543.03392804097 / resolution));
          const fontSize = Math.max(10, zoom * 1.2);

          return new Style({
            fill: new Fill({
              color: this.convertToTransparent(
                feature.get('color'),
                this.opacityValue
              ),
              // color: tempFeature.get('color'),
            }),
            stroke: new Stroke({
              color: '#000',
              width: 1,
            }),

            text:
              zoom >= 10
                ? new Text({
                    textAlign: align,
                    textBaseline: baseline,
                    font: 'bold 11px "Segoe UI", "Roboto", "Open Sans", sans-serif',
                    text:
                      resolution > 2500
                        ? ''
                        : `${tempFeature.get('name')}\n${tempFeature.get(
                            'dryspell'
                          )}`,

                    fill: new Fill({ color: '#333' }),
                    // stroke: new Stroke({ color: outlineColor, width: outlineWidth }),
                    stroke: new Stroke({
                      color: '#ffffff', // white outline
                      width: 2,
                    }),
                    placement: placement,
                    maxAngle: maxAngle,
                    overflow: overflow,
                    rotation: rotation,
                  })
                : undefined,
          });
        });
        features.push(tempFeature);
      }
      const source: VectorSource = this.tempVectorLayer.getSource();
      source!.clear();
      source!.addFeatures(features);
      const view = this.map.getView();
      this.zoomToFeature(view, source.getExtent());
      this.reloading = false;
      this.cdr.detectChanges();
    } catch (error) {
      console.error(error);
      alert('Something went wrong!');
      this.reloading = false;
      this.cdr.detectChanges();
    }
  }

  getOceanData(harardType: any) {
    this.reloading = true;
    this.cdr.detectChanges();
    try {
      let val = this.getLast24HourRange();
      let obj = {
        fromDate: val.fromDate,
        toDate: val.toDate,
      };
      this.alertService.getOceanData(obj).subscribe({
        next: (response) => {
          if (response.status === true) {
            if (response.data.length > 0) {
              let keralaStateData = response.data.filter(
                (item: any) => item.state.toLowerCase() === 'kerala'
              );
              if (keralaStateData.length > 0) {
                this.addOceanSwellSurgeDisasterInMap(keralaStateData);
              } else {
                alert('Data not present');
              }
            } else {
              alert('Data not present');
            }
          } else {
            alert(response.message);
          }
          this.reloading = false;
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.reloading = false;
          console.log(err);
        },
      });
    } catch (error) {
      console.error(error);
      alert('Something went wrong!');
      this.reloading = false;
      this.cdr.detectChanges();
    }
  }

  getSwellSurgeData(hazardType: string) {
    this.reloading = true;
    this.cdr.detectChanges();
    try {
      let val = this.getLast24HourRange();
      let obj = {
        fromDate: val.fromDate,
        toDate: val.toDate,
      };
      this.alertService.getSwellSurgeData(obj).subscribe({
        next: (response) => {
          if (response.status === true) {
            if (response.data.length > 0) {
              let keralaStateData = response.data.filter(
                (item: any) => item.state.toLowerCase() === 'kerala'
              );
              if (keralaStateData.length > 0) {
                this.addOceanSwellSurgeDisasterInMap(keralaStateData);
              } else {
                alert('Data not present');
              }
            } else {
              alert('Data not present');
            }
          } else {
            alert(response.message);
          }
          this.reloading = false;
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error(err);
          this.reloading = false;
        },
      });
    } catch (error) {
      console.error(error);
      alert('Something went wrong!');
      this.reloading = false;
      this.cdr.detectChanges();
    }
  }

  getHighWaveTidesData(hazardType: string) {
    this.reloading = true;
    this.cdr.detectChanges();
    try {
      let val = this.getLast24HourRange();
      let obj = {
        fromDate: val.fromDate,
        toDate: val.toDate,
      };
      let obj2 = {
        fromDate: '2025-05-20 00:00:00',
        toDate: '2025-05-25 00:00:00',
      };
      this.alertService.getHighWaveTidesData(obj).subscribe({
        next: (response) => {
          if (response.status === true) {
            if (response.data.length > 0) {
              let keralaStateData = response.data.filter(
                (item: any) => item.state.toLowerCase() === 'kerala'
              );
              if (keralaStateData.length > 0) {
                this.addHighLowTideWaveInMap(keralaStateData);
              } else {
                alert('Data not present');
              }
            } else {
              alert('Data not present');
            }
          } else {
            alert(response.message);
          }
          this.reloading = false;
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error(err);
          this.reloading = false;
        },
      });
    } catch (error) {
      console.error(error);
      alert('Something went wrong!');
      this.reloading = false;
      this.cdr.detectChanges();
    }
  }

  getLowWaveTidesData(hazardType: string) {
    alert('Data not found');
    this.reloading = false;
    this.cdr.detectChanges();
  }

  getLowWaveTidesData2(hazardType: string) {
    this.reloading = true;
    this.cdr.detectChanges();
    try {
      let val = this.getLast24HourRange();
      let obj = {
        fromDate: val.fromDate,
        toDate: val.toDate,
      };
      let obj2 = {
        fromDate: '2025-05-20 00:00:00',
        toDate: '2025-05-25 00:00:00',
      };
      this.alertService.getLowWaveTidesData(obj).subscribe({
        next: (response) => {
          if (response.status === true) {
            if (response.data.length > 0) {
              this.addHighLowTideWaveInMap(response.data);
            } else {
              alert('Data not present');
            }
          } else {
            alert(response.message);
          }
          this.reloading = false;
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error(err);
          this.reloading = false;
        },
      });
    } catch (error) {
      console.error(error);
      alert('Something went wrong!');
      this.reloading = false;
      this.cdr.detectChanges();
    }
  }

  normalizeDistricts(data: any[]): any[] {
    const result: any[] = [];
    for (const item of data) {
      if (item.district.includes(',')) {
        const districts = item.district.split(',').map((d: any) => d.trim());
        for (const d of districts) {
          result.push({
            ...item,
            district: d,
          });
        }
      } else {
        result.push({
          ...item,
          name: item.district,
        });
      }
    }
    return result;
  }

  addHighLowTideWaveInMap(keralaStateData: any) {
    console.log(keralaStateData);

    try {
      let res = this.normalizeDistricts(keralaStateData);
      console.log(res);

      let uniqueDistrictsObj: any[] = [];
      const uniqueDistricts = new Set();
      res.forEach((item: any) => {
        if (!uniqueDistricts.has(item.district)) {
          uniqueDistricts.add(item.district);
          uniqueDistrictsObj.push(item);
        }
      });
      const districtLsgIds: any[] = [];
      uniqueDistrictsObj.forEach((item: any) => {
        const matches = this.nearByDistrictLsg.filter(
          (item2: any) =>
            item2.districtname.toLowerCase() === item.district.toLowerCase()
        );
        if (matches && matches.length > 0) {
          for (let i of matches) {
            districtLsgIds.push({
              lsgid: i.lsgid,
              message: item.message,
            });
          }
        }
      });
      const matchingLsgData: any[] = [];
      districtLsgIds.forEach((item: any) => {
        const match = this.allLsgBoundaryData.find(
          (item2: any) =>
            item2.properties.lsgid.toLowerCase() === item.lsgid.toLowerCase()
        );
        if (match) {
          matchingLsgData.push({
            ...match,
            message: item.message,
          });
        }
      });
      let features: Array<Feature> = [];
      for (let i = 0; i < matchingLsgData.length; i++) {
        const feature = matchingLsgData[i];
        const coords = feature.geometry.coordinates[0];
        const poly3857 = coords.map((coord: any) =>
          transform(coord, this.PROJECTION_EPSG_4326, this.PROJECTION_EPSG_3857)
        );
        let lsgFeature: Feature = new Feature({
          name: feature.properties.name,
          message: feature.message,
          category: 'DisasterBoundary',
          geometry: new Polygon([poly3857]),
        });
        features.push(lsgFeature);
      }
      const source: VectorSource = this.disasterVectorLayer2.getSource();
      source!.clear();
      source!.addFeatures(features);
      const view = this.map.getView();
      this.zoomToFeature(view, source.getExtent());
      this.reloading = false;
      this.cdr.detectChanges();
    } catch (error) {
      alert('Something went wrong!');
      console.error(error);
      this.reloading = false;
      this.cdr.detectChanges();
    }
  }

  getCycloneData(hazardType: string) {
    this.reloading = true;
    this.cdr.detectChanges();
    try {
      let val = this.getLast24HourRange();
      let obj = {
        fromDate: val.fromDate,
        toDate: val.toDate,
        source: 'jtwc',
      };
      this.alertService.getCycloneData(obj).subscribe({
        next: (response) => {
          if (response.status === true) {
            if (response.data.length > 0) {
              this.addCycloneDisasterInMap(response.data, hazardType);
            } else {
              alert('Data not present');
            }
          } else {
            alert(response.message);
          }
          this.reloading = false;
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error(err);
          this.reloading = false;
        },
      });
    } catch (error) {
      console.error(error);
      alert('Something went wrong!');
      this.reloading = false;
      this.cdr.detectChanges();
    }
  }

  getThunderData(hazardType: string) {
    this.reloading = true;
    this.cdr.detectChanges();
    try {
      let val = this.getLast24HourRange();
      let obj = {
        fromDate: val.fromDate,
        toDate: val.toDate,
      };
      this.alertService.getDTAData(obj).subscribe({
        next: (response) => {
          if (response.status === true) {
            if (response.data.length > 0) {
              // Transforming data for each item in the response
              response.data = response.data.map(
                (item: { [x: string]: any; area_desc: any }) => {
                  // Extract latitude and longitude from area_desc
                  const latLon = item.area_desc.match(
                    /Latitude: ([0-9.-]+), Longitude: ([0-9.-]+)/
                  );
                  const lat = latLon ? parseFloat(latLon[1]) : null;
                  const lon = latLon ? parseFloat(latLon[2]) : null;
                  const { area_desc, ...other } = item;
                  return {
                    ...other,
                    long: lon,
                    lat: lat,
                  };
                }
              );
              this.addDisasterInMap(response.data, hazardType);
            } else {
              alert('Data not present');
            }
          } else {
            alert(response.message);
          }
          this.reloading = false;
          this.cdr.detectChanges();
        },
        error: (err: any) => {
          console.error(err);
          this.reloading = false;
        },
      });
    } catch (error) {
      console.error(error);
      alert('Something went wrong!');
      this.reloading = false;
      this.cdr.detectChanges();
    }
    this.cdr.detectChanges();
  }

  getLighteningData(hazardType: string) {
    this.reloading = true;
    this.cdr.detectChanges();
    try {
      let val = this.getLast24HourRange();
      let obj = {
        fromDate: val.fromDate,
        toDate: val.toDate,
      };
      this.alertService.getLightningData(obj).subscribe({
        next: (response) => {
          if (response.status === true) {
            if (response.data.length > 0) {
              this.addDisasterInMap(response.data, hazardType);
            } else {
              alert('Data not present');
            }
          } else {
            alert(response.message);
          }
          this.reloading = false;
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error(err);
          this.reloading = false;
        },
      });
    } catch (error) {
      console.error(error);
      alert('Something went wrong!');
      this.reloading = false;
      this.cdr.detectChanges();
    }
  }

  getEarthQuakeData() {
    this.reloading = true;
    this.cdr.detectChanges();
    try {
      let val = this.getLast24HourRange();
      let obj = {
        fromDate: val.fromDate,
        toDate: val.toDate,
      };
      this.alertService.getEarthQuakeData(obj).subscribe({
        next: (response) => {
          if (response.status === true) {
            if (response.data.length > 0) {
              const colorAddedJson = response.data.map((item: any) => {
                const color = this.rangeService.getColorForRainfall(
                  item?.magnitude
                );
                return { ...item, color };
              });
              this.addEarthQuakeDisasterInMap(colorAddedJson);
            } else {
              alert('Data not present');
            }
          } else {
            alert(response.message);
          }
          this.reloading = false;
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error(err);
          this.reloading = false;
        },
      });
    } catch (error) {
      console.error(error);
      alert('Something went wrong!');
      this.reloading = false;
      this.cdr.detectChanges();
    }
  }

  removeDisasterInMap() {
    const source: VectorSource = this.disasterVectorLayer.getSource();
    source!.clear();
    const source2: VectorSource = this.disasterVectorLayer2.getSource();
    source2!.clear();
  }

  addEarthQuakeDisasterInMap(earthquakes: any) {
    let earquakesWithCoord: any = [];
    earthquakes.forEach((item: any) => {
      const match = this.allLsgBoundaryData.find(
        (item2: any) =>
          item2.properties.lsgid.toLowerCase() === item.lsgid.toLowerCase()
      );
      if (match) {
        earquakesWithCoord.push({
          ...item,
          coordinates: match.geometry.coordinates,
        });
      }
    });
    console.log(earquakesWithCoord);
    let features: Array<Feature> = [];
    for (let i = 0; i < earquakesWithCoord.length; i++) {
      const feature = earquakesWithCoord[i];
      const coords = feature.coordinates[0];
      const poly3857 = coords.map((coord: any) =>
        transform(coord, this.PROJECTION_EPSG_4326, this.PROJECTION_EPSG_3857)
      );
      let lsgFeature: Feature = new Feature({
        name: feature.lsg,
        date: feature.date,
        depth: feature.depth,
        magnitude: feature.magnitude,
        direction: feature.direction,
        category: 'EarthQuakeDisasterBoundary',
        geometry: new Polygon([poly3857]),
      });

      const align = 'center';
      const baseline = 'middle';
      const size = '20px';
      const height = '1';
      const weight = 'bold';
      const placement = 'point';
      const maxAngle = 45;
      const overflow = true;
      const rotation = 0;
      const font = weight + ' ' + size + '/' + height + ' ' + 'Courier New';
      const fillColor = 'black';
      const outlineColor = 'white';
      const outlineWidth = 2;

      lsgFeature.setStyle(
        new Style({
          fill: new Fill({
            color: feature.color,
          }),
          stroke: new Stroke({
            color: '#000',
            width: 1,
          }),

          text: new Text({
            textAlign: align,
            textBaseline: baseline,
            font: font,
            text: feature.lsg + ' ' + feature.magnitude,
            fill: new Fill({ color: fillColor }),
            stroke: new Stroke({ color: outlineColor, width: outlineWidth }),
            placement: placement,
            maxAngle: maxAngle,
            overflow: overflow,
            rotation: rotation,
          }),
        })
      );
      features.push(lsgFeature);
    }

    const source: VectorSource = this.disasterVectorLayer2.getSource();
    source!.clear();
    source!.addFeatures(features);
    const view = this.map.getView();
    this.zoomToFeature(view, source.getExtent());
    this.reloading = false;
    this.cdr.detectChanges();
  }

  addOceanSwellSurgeDisasterInMap(keralaStateData: any) {
    try {
      let uniqueDistrictsObj: any[] = [];
      const uniqueDistricts = new Set();
      keralaStateData.forEach((item: any) => {
        if (!uniqueDistricts.has(item.district)) {
          uniqueDistricts.add(item.district);
          uniqueDistrictsObj.push(item);
        }
      });
      const districtLsgIds: any[] = [];
      uniqueDistrictsObj.forEach((item: any) => {
        const matches = this.nearByDistrictLsg.filter(
          (item2: any) =>
            item2.districtname.toLowerCase() === item.district.toLowerCase()
        );
        if (matches && matches.length > 0) {
          for (let i of matches) {
            districtLsgIds.push({
              lsgid: i.lsgid,
              message: item.message,
            });
          }
        }
      });
      const matchingLsgData: any[] = [];
      districtLsgIds.forEach((item: any) => {
        const match = this.allLsgBoundaryData.find(
          (item2: any) =>
            item2.properties.lsgid.toLowerCase() === item.lsgid.toLowerCase()
        );
        if (match) {
          matchingLsgData.push({
            ...match,
            message: item.message,
          });
        }
      });
      let features: Array<Feature> = [];
      for (let i = 0; i < matchingLsgData.length; i++) {
        const feature = matchingLsgData[i];
        const coords = feature.geometry.coordinates[0];
        const poly3857 = coords.map((coord: any) =>
          transform(coord, this.PROJECTION_EPSG_4326, this.PROJECTION_EPSG_3857)
        );
        let lsgFeature: Feature = new Feature({
          name: feature.properties.name,
          message: feature.message,
          category: 'DisasterBoundary',
          geometry: new Polygon([poly3857]),
        });
        features.push(lsgFeature);
      }
      const source: VectorSource = this.disasterVectorLayer2.getSource();
      source!.clear();
      source!.addFeatures(features);
      const view = this.map.getView();
      this.zoomToFeature(view, source.getExtent());
      this.reloading = false;
      this.cdr.detectChanges();
    } catch (error) {
      alert('Something went wrong!');
      console.error(error);
      this.reloading = false;
      this.cdr.detectChanges();
    }
  }

  addDisasterInMap(items: Object[], hazardType: string): void {
    let features: Array<Feature> = [];
    for (let i = 0; i < items.length; i++) {
      let disaster: any = items[i];
      let feature: Feature = new Feature({
        category: 'Disaster',
        geometry: new Point([disaster.long, disaster.lat]).transform(
          this.PROJECTION_EPSG_4326,
          this.PROJECTION_EPSG_3857
        ),
      });
      Object.keys(disaster).forEach((key) => {
        feature.set(key, disaster[key]);
      });
      features.push(feature);
    }
    const source: VectorSource = this.disasterVectorLayer.getSource();
    source!.clear();
    source!.addFeatures(features);
    const view = this.map.getView();
    this.zoomToFeature(view, source.getExtent());
    this.reloading = false;
    this.cdr.detectChanges();
  }

  addCycloneDisasterInMap(items: Object[], hazardType: string) {
    let features: Array<Feature> = [];
    for (let i = 0; i < items.length; i++) {
      let obj: any = items[i];
      if (obj.geometry === null || obj.geometry === '{}') {
        console.log('Object is either null or empty');
      } else {
        console.log(obj.geometry);
      }

      // let disaster: any = items[i];
      // let feature: Feature = new Feature({
      //   category: 'Disaster',
      //   geometry: new Point([disaster.long, disaster.lat]).transform(
      //     this.PROJECTION_EPSG_4326,
      //     this.PROJECTION_EPSG_3857
      //   ),
      // });
      // Object.keys(disaster).forEach((key) => {
      //   feature.set(key, disaster[key]);
      // });
      // features.push(feature);
    }
    // const source: VectorSource = this.disasterVectorLayer.getSource();
    // source!.clear();
    // source!.addFeatures(features);
    // const view = this.map.getView();
    // this.zoomToFeature(view, source.getExtent());
    this.reloading = false;
    this.cdr.detectChanges();
  }

  // weather forecast

  hideAllScale() {
    this.alertRange = false;
    this.hazardRange = false;
    this.rainRange = false;
    this.tempRange = false;
    this.windRange = false;
    this.humidityRange = false;
    this.populationRange = false;
    this.floodRange = false;
    this.landSlideRange = false;
  }

  selectForecastOptions() {
    this.weatherSelectionOption = true;
    this.closeWeatherSelect = true;
    this.showWeatherSelect = false;
    if (this.hideLocationSelection === 'Actual Weather') {
      this.hideAllScale();
      this.actualWeatherSelect = true;
      this.weatherForecastSelect = false;
    } else if (this.hideLocationSelection === 'Weather Forecast') {
      this.weatherForecastSelect = true;
      this.actualWeatherSelect = false;
    }
  }

  weatherForecastSource() {}

  selectedLocation: any = 'All';
  selectedShelterLocation: any = { id: 0, name: 'All' };

  onLocationChange($event: any) {
    this.removeTempVectorLayer();
  }

  onShelterLocationChange($event: any) {
    if ($event) {
      if ($event.value.id == 0) {
        this.addPOIinMap(this.fetchedPoiData);
      } else {
        let res = this.fetchedPoiData.filter(
          (item: any) => item.districtid == $event.value.id
        );
        this.addPOIinMap(res);
      }
    }
  }

  getActualWeatherData(param: string, selectedForecast: string) {
    this.opacitySection = true;
    this.fieldName = 'actual';
    

    this.hideAllScale();
    this.popupCloser();
    this.removePoiOverlay();
    this.pinPopupClose();
    this.resetCursor();
    this.removeDisasterInMap();
    this.removeTempVectorLayer();
    this.removeSuspectabilityImageVectorSource();
    this.layerSubject.next([]);

    if (!selectedForecast != null) {
      switch (param) {
        // temperature
        case 'temp-1':
          this.getCommonActualData(24, selectedForecast, 'temperature');
          break;
        case 'temp-2':
          this.getCommonActualData(2, selectedForecast, 'temperature');
          break;
        case 'temp-3':
          this.getCommonActualData(3, selectedForecast, 'temperature');
          break;

        // humidity
        case 'humidity-1':
          this.getCommonActualData(24, selectedForecast, 'humidity');
          break;
        case 'humidity-2':
          this.getCommonActualData(2, selectedForecast, 'humidity');
          break;
        case 'humidity-3':
          this.getCommonActualData(3, selectedForecast, 'humidity');
          break;

        //rain
        case 'rain-1':
          this.getCommonActualData(24, selectedForecast, 'rain');
          break;
        case 'rain-2':
          this.getCommonActualData(2, selectedForecast, 'rain');
          break;
        case 'rain-3':
          this.getCommonActualData(3, selectedForecast, 'rain');
          break;

        //wind
        case 'wind-1':
          this.getCommonActualData(24, selectedForecast, 'wind');
          break;
        case 'wind-2':
          this.getCommonActualData(2, selectedForecast, 'wind');
          break;
        case 'wind-3':
          this.getCommonActualData(3, selectedForecast, 'wind');
          break;
      }
    } else {
      this.opacitySection = false;
      alert('Select valid source first');
    }
  }

  getCommonActualData(
    weatherDay: Number,
    selectedSource: String,
    paramName: String
  ) {
    this.hideAllScale();
    this.reloading = true;

    if (weatherDay === 24) {
      let obj = {
        weather_day: [weatherDay],
        source: selectedSource,
        id: 1,
        tenantCode: 'EWDS',
        weatherParameter: paramName,
        locationType: 'District',
        aggType: 'avg',
        name: '',
        sortKey: 'name',
        order: false,
      };

      this.alertService.getActualTodayWeatherData(obj).subscribe({
        next: (response) => {
          if (response.status === true) {
            if (response.data.length > 0) {
              // console.log(response);

              if (paramName === 'temperature') {
                //this.tempRange = true;
                const colorAddedJson = response.data.map((item: any) => {
                  const color = this.rangeService.getColorForTemperature(
                    item?.['24thhour']
                  );
                  return { ...item, color };
                });
                this.getMapLsgFeature(colorAddedJson);
              } else if (paramName === 'humidity') {
                this.humidityRange = true;
                const colorAddedJson = response.data.map((item: any) => {
                  const color = this.rangeService.getColorForHumidity(
                    item?.['24thhour']
                  );
                  return { ...item, color };
                });
                this.getMapLsgFeature(colorAddedJson);
              } else if (paramName === 'rain') {
                // this.rainRange = true;
                const colorAddedJson = response.data.map((item: any) => {
                  const color = this.rangeService.getColorForRainfall(
                    item?.['24thhour']
                  );
                  return { ...item, color };
                });
                this.getMapLsgFeature(colorAddedJson);
              } else if (paramName === 'wind') {
                // this.windRange = true;
                const colorAddedJson = response.data.map((item: any) => {
                  const color = this.rangeService.getColorForWindSpeed(
                    item?.['24thhour']
                  );
                  return { ...item, color };
                });
                this.getMapLsgFeature(colorAddedJson);
              }
            }
          } else {
            alert(response.message);
            this.reloading = false;
            this.cdr.detectChanges();
          }
        },
        error: (err) => {
          console.log(err);
          this.reloading = false;
          this.cdr.detectChanges();
        },
      });
    } else {
      let obj = {
        weather_day: [weatherDay],
        source: selectedSource,
        id: 1,
        tenantCode: 'EWDS',
        weatherParameter: paramName,
        locationType: 'District',
        aggType: 'avg',
        name: '',
        sortkey: 'name',
        order: false,
      };

      this.alertService.getActualLastDayWeatherData(obj).subscribe({
        next: (response) => {
          if (response.status === true) {
            if (response.data.length > 0) {
              if (paramName === 'temperature') {
                //this.tempRange = true;
                const colorAddedJson = response.data.map((item: any) => {
                  const color = this.rangeService.getColorForTemperature(
                    item?.weatherdata
                  );
                  return { ...item, color };
                });
                this.getMapLsgFeature(colorAddedJson);
              } else if (paramName === 'humidity') {
                // this.tempRange = true;
                const colorAddedJson = response.data.map((item: any) => {
                  const color = this.rangeService.getColorForHumidity(
                    item?.weatherdata
                  );
                  return { ...item, color };
                });
                this.getMapLsgFeature(colorAddedJson);
              } else if (paramName === 'wind') {
                //this.tempRange = true;
                const colorAddedJson = response.data.map((item: any) => {
                  const color = this.rangeService.getColorForWindSpeed(
                    item?.weatherdata
                  );
                  return { ...item, color };
                });
                this.getMapLsgFeature(colorAddedJson);
              } else if (paramName === 'rain') {
                // this.tempRange = true;
                const colorAddedJson = response.data.map((item: any) => {
                  const color = this.rangeService.getColorForRainfall(
                    item?.weatherdata
                  );
                  return { ...item, color };
                });
                this.getMapLsgFeature(colorAddedJson);
              }
            } else {
              this.opacitySection = false;
              alert('Data not present');
              this.reloading = false;
              this.cdr.detectChanges();
            }
          } else {
            alert(response.message);
            this.reloading = false;
            this.cdr.detectChanges();
          }
        },
        error: (err) => {
          console.log(err);
          this.reloading = false;
          this.cdr.detectChanges();
        },
      });
    }
  }

  lsgBoundaryFeatures: any[] = [];
  getMapLsgFeature(lsgWeatherData: any[]) {
    let res = lsgWeatherData.map((obj1) => {
      const match = this.allLsgBoundaryData.find(
        (obj2) => obj2.properties.lsgid === obj1.lsgid
      );
      // const match = this.allLsgBoundaryData.find(
      //   (obj2) => obj2.properties.name.toLowerCase() === obj1.lsg.toLowerCase()
      // );
      return match
        ? { ...obj1, coordinates: match.geometry.coordinates[0] }
        : obj1;
    });
    this.addIntoTempBoundaryLsg(res);
  }

  getForecastData(param: string, selectedForecast: string) {
    this.opacitySection = true;
    this.fieldName = 'forecast';

    this.hideAllScale();
    this.popupCloser();
    this.removePoiOverlay();
    this.pinPopupClose();
    this.resetCursor();
    this.removeDisasterInMap();
    this.removeTempVectorLayer();
    this.removeSuspectabilityImageVectorSource();
    this.layerSubject.next([]);
    if (this.selectedForecast != null) {
      switch (param) {
        // rain

        case 'rain-1':
          if (selectedForecast === 'ibm') {
            this.getCommonForeCastData(1, 'ibmrainavg', 'rain');
          } else if (selectedForecast === 'imd') {
            this.getCommonForeCastData(1, 'imdrainavg', 'rain');
          } else if (selectedForecast === 'imd_gfs') {
            this.getCommonForeCastData(1, 'imd_ntcdfrainavg', 'rain');
          } else if (selectedForecast === 'imd_ncum') {
            this.getCommonForeCastData(1, 'imd_ncmrwfrainavg', 'rain');
          } else if (selectedForecast === 'skymet') {
            this.getCommonForeCastData(1, 'skymetrainavg', 'rain');
          } else if (selectedForecast === 'ensemble') {
            this.getCommonForeCastData(1, 'ensemblerainavg', 'rain');
          }
          break;
        case 'rain-2':
          if (selectedForecast === 'ibm') {
            this.getCommonForeCastData(2, 'ibmrainavg', 'rain');
          } else if (selectedForecast === 'imd') {
            this.getCommonForeCastData(2, 'imdrainavg', 'rain');
          } else if (selectedForecast === 'imd_gfs') {
            this.getCommonForeCastData(2, 'imd_ntcdfrainavg', 'rain');
          } else if (selectedForecast === 'imd_ncum') {
            this.getCommonForeCastData(2, 'imd_ncmrwfrainavg', 'rain');
          } else if (selectedForecast === 'skymet') {
            this.getCommonForeCastData(2, 'skymetrainavg', 'rain');
          } else if (selectedForecast === 'ensemble') {
            this.getCommonForeCastData(2, 'ensemblerainavg', 'rain');
          }
          break;
        case 'rain-3':
          if (selectedForecast === 'ibm') {
            this.getCommonForeCastData(3, 'ibmrainavg', 'rain');
          } else if (selectedForecast === 'imd') {
            this.getCommonForeCastData(3, 'imdrainavg', 'rain');
          } else if (selectedForecast === 'imd_gfs') {
            this.getCommonForeCastData(3, 'imd_ntcdfrainavg', 'rain');
          } else if (selectedForecast === 'imd_ncum') {
            this.getCommonForeCastData(3, 'imd_ncmrwfrainavg', 'rain');
          } else if (selectedForecast === 'skymet') {
            this.getCommonForeCastData(3, 'skymetrainavg', 'rain');
          } else if (selectedForecast === 'ensemble') {
            this.getCommonForeCastData(3, 'ensemblerainavg', 'rain');
          }
          break;

        // wind

        case 'wind-1':
          if (selectedForecast === 'ibm') {
            this.getCommonForeCastData(1, 'ibmwind_speedavg', 'wind');
          } else if (selectedForecast === 'imd') {
            this.getCommonForeCastData(1, 'imdwind_speedavg', 'wind');
          } else if (selectedForecast === 'imd_gfs') {
            this.getCommonForeCastData(1, 'imd_ntcdfwind_speedavg', 'wind');
          } else if (selectedForecast === 'imd_ncum') {
            this.getCommonForeCastData(1, 'imd_ncmrwfwind_speedavg', 'wind');
          } else if (selectedForecast === 'skymet') {
            this.getCommonForeCastData(1, 'skymetwind_speedavg', 'wind');
          } else if (selectedForecast === 'ensemble') {
            this.getCommonForeCastData(1, 'ensemblewind_speedavg', 'wind');
          }
          break;
        case 'wind-2':
          if (selectedForecast === 'ibm') {
            this.getCommonForeCastData(2, 'ibmwind_speedavg', 'wind');
          } else if (selectedForecast === 'imd') {
            this.getCommonForeCastData(2, 'imdwind_speedavg', 'wind');
          } else if (selectedForecast === 'imd_gfs') {
            this.getCommonForeCastData(2, 'imd_ntcdfwind_speedavg', 'wind');
          } else if (selectedForecast === 'imd_ncum') {
            this.getCommonForeCastData(2, 'imd_ncmrwfwind_speedavg', 'wind');
          } else if (selectedForecast === 'skymet') {
            this.getCommonForeCastData(2, 'skymetwind_speedavg', 'wind');
          } else if (selectedForecast === 'ensemble') {
            this.getCommonForeCastData(2, 'ensemblewind_speedavg', 'wind');
          }
          break;
        case 'wind-3':
          if (selectedForecast === 'ibm') {
            this.getCommonForeCastData(3, 'ibmwind_speedavg', 'wind');
          } else if (selectedForecast === 'imd') {
            this.getCommonForeCastData(3, 'imdwind_speedavg', 'wind');
          } else if (selectedForecast === 'imd_gfs') {
            this.getCommonForeCastData(3, 'imd_ntcdfwind_speedavg', 'wind');
          } else if (selectedForecast === 'imd_ncum') {
            this.getCommonForeCastData(3, 'imd_ncmrwfwind_speedavg', 'wind');
          } else if (selectedForecast === 'skymet') {
            this.getCommonForeCastData(3, 'skymetwind_speedavg', 'wind');
          } else if (selectedForecast === 'ensemble') {
            this.getCommonForeCastData(3, 'ensemblewind_speedavg', 'wind');
          }
          break;

        // temperature

        case 'temp-1':
          if (selectedForecast === 'ibm') {
            this.getCommonForeCastData(1, 'ibmtemperatureavg', 'temperature');
          } else if (selectedForecast === 'imd') {
            this.getCommonForeCastData(1, 'imdtemperatureavg', 'temperature');
          } else if (selectedForecast === 'imd_gfs') {
            this.getCommonForeCastData(
              1,
              'imd_ntcdftemperatureavg',
              'temperature'
            );
          } else if (selectedForecast === 'imd_ncum') {
            this.getCommonForeCastData(
              1,
              'imd_ncmrwftemperatureavg',
              'temperature'
            );
          } else if (selectedForecast === 'skymet') {
            this.getCommonForeCastData(
              1,
              'skymettemperatureavg',
              'temperature'
            );
          } else if (selectedForecast === 'ensemble') {
            this.getCommonForeCastData(
              1,
              'ensembletemperatureavg',
              'temperature'
            );
          }
          break;
        case 'temp-2':
          if (selectedForecast === 'ibm') {
            this.getCommonForeCastData(2, 'ibmtemperatureavg', 'temperature');
          } else if (selectedForecast === 'imd') {
            this.getCommonForeCastData(2, 'imdtemperatureavg', 'temperature');
          } else if (selectedForecast === 'imd_gfs') {
            this.getCommonForeCastData(
              2,
              'imd_ntcdftemperatureavg',
              'temperature'
            );
          } else if (selectedForecast === 'imd_ncum') {
            this.getCommonForeCastData(
              2,
              'imd_ncmrwftemperatureavg',
              'temperature'
            );
          } else if (selectedForecast === 'skymet') {
            this.getCommonForeCastData(
              2,
              'skymettemperatureavg',
              'temperature'
            );
          } else if (selectedForecast === 'ensemble') {
            this.getCommonForeCastData(
              2,
              'ensembletemperatureavg',
              'temperature'
            );
          }
          break;
        case 'temp-3':
          if (selectedForecast === 'ibm') {
            this.getCommonForeCastData(3, 'ibmtemperatureavg', 'temperature');
          } else if (selectedForecast === 'imd') {
            this.getCommonForeCastData(3, 'imdtemperatureavg', 'temperature');
          } else if (selectedForecast === 'imd_gfs') {
            this.getCommonForeCastData(
              3,
              'imd_ntcdftemperatureavg',
              'temperature'
            );
          } else if (selectedForecast === 'imd_ncum') {
            this.getCommonForeCastData(
              3,
              'imd_ncmrwftemperatureavg',
              'temperature'
            );
          } else if (selectedForecast === 'skymet') {
            this.getCommonForeCastData(
              3,
              'skymettemperatureavg',
              'temperature'
            );
          } else if (selectedForecast === 'ensemble') {
            this.getCommonForeCastData(
              3,
              'ensembletemperatureavg',
              'temperature'
            );
          }
          break;

        // humidity

        case 'humidity-1':
          if (selectedForecast === 'ibm') {
            this.getCommonForeCastData(1, 'ibmhumidityavg', 'humidity');
          } else if (selectedForecast === 'imd') {
            this.getCommonForeCastData(1, 'imdhumidityavg', 'humidity');
          } else if (selectedForecast === 'imd_gfs') {
            this.getCommonForeCastData(1, 'imd_ntcdfhumidityavg', 'humidity');
          } else if (selectedForecast === 'imd_ncum') {
            this.getCommonForeCastData(1, 'imd_ncmrwfhumidityavg', 'humidity');
          } else if (selectedForecast === 'skymet') {
            this.getCommonForeCastData(1, 'skymethumidityavg', 'humidity');
          } else if (selectedForecast === 'ensemble') {
            this.getCommonForeCastData(1, 'ensemblehumidityavg', 'humidity');
          }
          break;
        case 'humidity-2':
          if (selectedForecast === 'ibm') {
            this.getCommonForeCastData(2, 'ibmhumidityavg', 'humidity');
          } else if (selectedForecast === 'imd') {
            this.getCommonForeCastData(2, 'imdhumidityavg', 'humidity');
          } else if (selectedForecast === 'imd_gfs') {
            this.getCommonForeCastData(2, 'imd_ntcdfhumidityavg', 'humidity');
          } else if (selectedForecast === 'imd_ncum') {
            this.getCommonForeCastData(2, 'imd_ncmrwfhumidityavg', 'humidity');
          } else if (selectedForecast === 'skymet') {
            this.getCommonForeCastData(2, 'skymethumidityavg', 'humidity');
          } else if (selectedForecast === 'ensemble') {
            this.getCommonForeCastData(2, 'ensemblehumidityavg', 'humidity');
          }
          break;
        case 'humidity-3':
          if (selectedForecast === 'ibm') {
            this.getCommonForeCastData(3, 'ibmhumidityavg', 'humidity');
          } else if (selectedForecast === 'imd') {
            this.getCommonForeCastData(3, 'imdhumidityavg', 'humidity');
          } else if (selectedForecast === 'imd_gfs') {
            this.getCommonForeCastData(3, 'imd_ntcdfhumidityavg', 'humidity');
          } else if (selectedForecast === 'imd_ncum') {
            this.getCommonForeCastData(3, 'imd_ncmrwfhumidityavg', 'humidity');
          } else if (selectedForecast === 'skymet') {
            this.getCommonForeCastData(3, 'skymethumidityavg', 'humidity');
          } else if (selectedForecast === 'ensemble') {
            this.getCommonForeCastData(3, 'ensemblehumidityavg', 'humidity');
          }
          break;

        // default

        default:
          break;
      }
    } else {
      this.opacitySection = false;
      alert('Select source first');
    }
  }

  getCommonForeCastData(
    weatherDay: Number,
    weatherName: String,
    paramName: String
  ) {
    this.hideAllScale();
    this.reloading = true;
    let obj = {
      weatherDay: [weatherDay],
      id: 1,
      tenantCode: 'EWDS',
      locationType: 'District',
      order: false,
      sortKey: 'name',
      weatherName: weatherName,
    };

    this.alertService.getCommonForeCastLsgData(obj).subscribe({
      next: (response) => {
        if (response.status === true) {
          if (response.data.length > 0) {
            if (paramName === 'rain') {
              this.rainRange = true;
              const colorAddedJson = response.data.map((item: any) => {
                const color = this.rangeService.getColorForRainfall(
                  item?.weatherdata
                );
                return { ...item, color };
              });
              this.getMapLsgFeature(colorAddedJson);
            } else if (paramName === 'wind') {
              this.windRange = true;
              const colorAddedJson = response.data.map((item: any) => {
                const color = this.rangeService.getColorForWindSpeed(
                  item?.weatherdata
                );
                return { ...item, color };
              });
              this.getMapLsgFeature(colorAddedJson);
            } else if (paramName === 'temperature') {
              this.tempRange = true;
              const colorAddedJson = response.data.map((item: any) => {
                const color = this.rangeService.getColorForTemperature(
                  item?.weatherdata
                );
                return { ...item, color };
              });
              this.getMapLsgFeature(colorAddedJson);
            } else if (paramName === 'humidity') {
              this.humidityRange = true;
              const colorAddedJson = response.data.map((item: any) => {
                const color = this.rangeService.getColorForHumidity(
                  item?.weatherdata
                );
                return { ...item, color };
              });
              this.getMapLsgFeature(colorAddedJson);
            }
          }
        } else {
          alert(response.message);
          this.reloading = false;
          this.cdr.detectChanges();
        }
      },
      error: (err) => {
        this.opacitySection = false;
        this.reloading = false;
        console.log(err);
      },
    });
  }

  districtBoundaryFeatures: any[] = [];
  getMapDistrictFeature(districtWeatherData: any[]) {
    this.http
      .get<any>('assets/district-boundaries.json')
      .subscribe((response) => {
        if (response.length > 0) {
          this.districtBoundaryFeatures = response;
          let res = districtWeatherData.map((obj1) => {
            const match = this.districtBoundaryFeatures.find(
              (obj2) =>
                obj2.properties.districtname.toLowerCase() ===
                obj1.name.toLowerCase()
            );
            return match
              ? { ...obj1, coordinates: match.geometry.coordinates[0] }
              : obj1;
          });
          this.addIntoTempBoundaryDistrict(res);
        }
      });
  }

  addIntoTempBoundaryDistrict(object: any) {
    if (this.selectedLocation != 'All') {
      const filteredDistrict = object.filter(
        (obj: any) =>
          obj.name.toLowerCase() === this.selectedLocation.toLowerCase()
      );
      this.putDistrictIntoMap(
        filteredDistrict,
        filteredDistrict[0].coordinates
      );
    } else {
      const extent = [
        8333960.617555198, 926142.6638811225, 8617588.653840631,
        1436252.1723806032,
      ];
      this.putDistrictIntoMap(object, extent);
    }
  }

  putDistrictIntoMap(object: any, coord: any) {
    const transformedCoordinates = coord.map((coord: any) => fromLonLat(coord));
    const polygonFeature = new Feature({
      geometry: new Polygon([transformedCoordinates]),
    });

    let features: Array<Feature> = [];
    for (let i = 0; i < object.length; i++) {
      const feature = object[i];
      const coords = feature.coordinates;
      const poly3857 = coords.map((coord: any) =>
        transform(coord, this.PROJECTION_EPSG_4326, this.PROJECTION_EPSG_3857)
      );
      let tempFeature: Feature = new Feature({
        name: feature.name,
        category: 'tempDistrictBoundary',
        geometry: new Polygon([poly3857]),
      });

      const align = 'center';
      const baseline = 'middle';
      const size = '13px';
      const height = '1.3';
      const weight = 'bold';
      const placement = 'point';
      const maxAngle = 45;
      const overflow = true;
      const rotation = 0;
      const font = weight + ' ' + size + '/' + height + ' ' + 'Courier New';
      const fillColor = 'black';
      const outlineColor = 'white';
      const outlineWidth = 2;

      tempFeature.setStyle(
        new Style({
          fill: new Fill({
            color: feature.color,
          }),
          stroke: new Stroke({
            color: '#000',
            width: 1,
          }),

          text: new Text({
            textAlign: align,
            textBaseline: baseline,
            font: font,
            text: feature.name + ' ' + feature.weatherdata,
            fill: new Fill({ color: fillColor }),
            stroke: new Stroke({ color: outlineColor, width: outlineWidth }),
            placement: placement,
            maxAngle: maxAngle,
            overflow: overflow,
            rotation: rotation,
          }),
        })
      );

      features.push(tempFeature);
    }
    const source: VectorSource = this.tempVectorLayer.getSource();
    source!.clear();
    source!.addFeatures(features);
    source!.addFeature(polygonFeature);

    const view = this.map.getView();
    if (this.selectedLocation == 'All') {
      view.fit(coord, {
        duration: this.zoomDuration,
        padding: [50, 50, 50, 50],
        maxZoom: this.featureMaxZoom,
      });
    } else {
      const extent = polygonFeature.getGeometry()?.getExtent();
      if (extent) {
        view.fit(extent, {
          duration: this.zoomDuration,
          padding: [50, 50, 50, 50],
          maxZoom: this.featureMaxZoom,
        });
      }
    }
  }

  addIntoTempBoundaryLsg(object: any) {
    if (this.selectedLocation != 'All') {
      const filteredDistrict = object.filter(
        (obj: any) =>
          obj.name &&
          obj.name.toLowerCase() === this.selectedLocation.toLowerCase()
      );
      this.putLsgIntoMap(filteredDistrict, filteredDistrict[0].coordinates);
    } else {
      const extent = [
        8333960.617555198, 926142.6638811225, 8617588.653840631,
        1436252.1723806032,
      ];
      this.putLsgIntoMap(object, extent);
    }
  }

  putLsgIntoMap(object: any, coord: any) {
    this.sliderControl.setValue(100);
    this.landSlideRange = true;
    try {
      const transformedCoordinates = coord.map((coord: any) =>
        fromLonLat(coord)
      );
      const polygonFeature = new Feature({
        geometry: new Polygon([transformedCoordinates]),
      });

      let value: any = 0;

      let features: Array<Feature> = [];
      for (let i = 0; i < object.length; i++) {
        const feature = object[i];
        const coords = feature.coordinates;

        const poly3857 = coords.map((coord: any) =>
          transform(coord, this.PROJECTION_EPSG_4326, this.PROJECTION_EPSG_3857)
        );
        let tempFeature: Feature = new Feature({
          name: feature.lsg,
          category: 'tempLsgBoundary',
          color: feature.color,
          // data: feature.weatherdata,
          geometry: new Polygon([poly3857]),
        });

        if ('weatherdata' in feature) {
          value = feature.weatherdata;
          if (value === null) {
            tempFeature.set('value', 'NA');
          } else {
            tempFeature.set('value', value);
          }
        } else if ('24thhour' in feature) {
          value = feature['24thhour'];
          if (value === null) {
            tempFeature.set('value', 'NA');
          } else {
            tempFeature.set('value', value);
          }
        }

        const align = 'center';
        const baseline = 'middle';
        const size = '12px';
        const height = '1';
        const weight = 'bold';
        const placement = 'point';
        const maxAngle = 45;
        const overflow = true;
        const rotation = 0;
        const font = weight + ' ' + size + '/' + height + ' ' + 'Courier New';
        const fillColor = 'black';
        const outlineColor = 'white';
        const outlineWidth = 2;

        tempFeature.setStyle((feature, resolution) => {
          const zoom = Math.round(Math.log2(156543.03392804097 / resolution));
          const fontSize = Math.max(10, zoom * 1.2);

          return new Style({
            fill: new Fill({
              color: this.convertToTransparent(
                feature.get('color'),
                this.opacityValue
              ),
            }),
            stroke: new Stroke({
              color: '#000',
              width: this.weatherBoundaryThickness,
            }),
            text:
              zoom >= 10
                ? new Text({
                    textAlign: align,
                    textBaseline: baseline,
                    font: 'bold 13px "Segoe UI", "Roboto", "Open Sans", sans-serif',
                    // font: `${weight} ${fontSize}px/${height} Courier New`,
                    text: `${feature.get('name')}\n ${feature.get('value')}`,
                    fill: new Fill({ color: '#333' }),
                    // fill: new Fill({ color: fillColor }),
                    // stroke: new Stroke({ color: outlineColor, width: outlineWidth }),
                    stroke: new Stroke({
                      color: '#ffffff',
                      width: 2,
                    }),
                    placement: placement,
                    maxAngle: maxAngle,
                    overflow: overflow,
                    rotation: rotation,
                  })
                : undefined,
          });
        });

        features.push(tempFeature);
      }
      const source: VectorSource = this.tempVectorLayer.getSource();
      source!.clear();
      source!.addFeatures(features);

      const view = this.map.getView();
      if (this.selectedLocation == 'All') {
        view.fit(coord, {
          duration: this.zoomDuration,
          padding: [50, 50, 50, 50],
          maxZoom: this.featureMaxZoom,
        });
      } else {
        const extent = polygonFeature.getGeometry()?.getExtent();
        if (extent) {
          view.fit(extent, {
            duration: this.zoomDuration,
            padding: [50, 50, 50, 50],
            maxZoom: 10,
          });
        }
      }
      this.reloading = false;
      this.cdr.detectChanges();
    } catch (error) {
      alert('Something Went Wrong!');
      console.error(error);
      this.reloading = false;
      this.cdr.detectChanges();
    }
  }

  removeTempVectorLayer() {
    this.populationRange = false;
    const source: VectorSource = this.tempVectorLayer.getSource();
    source!.clear();
    const source2: VectorSource = this.populationVectorLayer.getSource();
    source2!.clear();
  }

  async addLandSlideSuspectabilityToMap() {
    this.opacitySection = true;
    this.fieldName = 'landslide';

    this.returnToOriginalMap();
    this.reloading = true;
    const existingSource: VectorSource =
      this.susceptibilityVectorImageLayer.getSource();
    existingSource?.clear();

    const cacheKey = 'land-susceptibility';
    const cachedData = await this.cacheDataService.getData(cacheKey);
    if (cachedData) {
      this.processLand(cachedData);
    } else {
      this.http
        .get('/assets/Landslide_Prone_NCESS_Susceptibility.json.fgz', {
          responseType: 'arraybuffer',
        })
        .subscribe((compressed: ArrayBuffer) => {
          const decompressedString = inflate(new Uint8Array(compressed), {
            to: 'string',
          });
          const geojsonData = JSON.parse(decompressedString);
          this.cacheDataService.storeData(cacheKey, geojsonData);
          this.processLand(geojsonData);
        });
    }
  }

  processLand(geojsonData: any) {
    this.handleOpacity(this.formatLabelToOpacity(100));
    this.sliderControl.setValue(100);
    this.landSlideRange = true;
    const vectorSource = new VectorSource({
      features: new GeoJSON().readFeatures(geojsonData, {
        dataProjection: 'EPSG:32643',
        featureProjection: 'EPSG:3857',
      }),
    });
    this.susceptibilityVectorImageLayer.setSource(vectorSource);
    this.susceptibilityVectorImageLayer.setStyle((feature) => {
      const susceptibility = feature.get('Susceptibi');
      let OpacityValue = this.opacityValue;
      // let fillColor = 'rgba(255, 0, 0, 1)';
      let fillColor = `rgba(255, 0, 0, ${OpacityValue})`;
      if (susceptibility === 'HHZ') {
        // fillColor = 'rgba(255, 0, 0, 1)';
        fillColor = `rgba(255, 0, 0, ${OpacityValue})`;
      } else if (susceptibility === 'LHZ') {
        // fillColor = 'rgba(255, 165, 0, 1)';
        fillColor = `rgba(255, 165, 0, ${OpacityValue})`;
      } else if (susceptibility === 'MHZ') {
        // fillColor = 'rgba(255, 255, 0, 1)';
        fillColor = `rgba(255, 225, 0, ${OpacityValue})`;
      }

      return [
        new Style({
          stroke: new Stroke({
            color: 'black',
            width: this.boundaryThickness + 0.1, // Add thickness for blackout effect
          }),
        }),
        new Style({
          stroke: new Stroke({
            color: fillColor,
            width: this.boundaryThickness,
            // lineDash: [2, 2],
          }),
          fill: new Fill({
            // color: this.convertToTransparent(fillColor, 0.6),
            color: fillColor,
          }),
        }),
      ];
    });
    this.reloading = false;
    this.cdr.detectChanges();
  }

  async addFloodSuspectabilityToMap() {
    this.opacitySection = true;
    this.fieldName = 'flood';

    this.returnToOriginalMap();
    this.reloading = true;
    const existingSource: VectorSource =
      this.susceptibilityVectorImageLayer.getSource();
    existingSource?.clear();

    const cacheKey = 'flood-susceptibility';
    const cachedData = await this.cacheDataService.getData(cacheKey);

    if (cachedData) {
      this.processFlood(cachedData);
    } else {
      this.http
        .get('/assets/Flood_Susceptibility.json.fgz', {
          responseType: 'arraybuffer',
        })
        .subscribe((compressed: ArrayBuffer) => {
          const decompressedString = inflate(new Uint8Array(compressed), {
            to: 'string',
          });
          const geojsonData = JSON.parse(decompressedString);
          this.cacheDataService.storeData(cacheKey, geojsonData);
          this.processFlood(geojsonData);
        });
    }
  }

  processFlood(geojsonData: any) {
    this.handleOpacity(this.formatLabelToOpacity(100));
    this.sliderControl.setValue(100);
    this.floodRange = true;
    const vectorSource = new VectorSource({
      features: new GeoJSON().readFeatures(geojsonData, {
        dataProjection: 'EPSG:32643',
        featureProjection: 'EPSG:3857',
      }),
    });

    this.susceptibilityVectorImageLayer.setSource(vectorSource);
    this.susceptibilityVectorImageLayer.setStyle((feature) => {
      const susceptibility = feature.get('Land_Forms');
      let OpacityValue = this.opacityValue;
      // let fillColor = 'rgba(0, 128, 0, 1.0)';
      let fillColor = `rgba(0, 128, 0, ${OpacityValue})`;
      if (susceptibility === 'Waterbody') {
        //  fillColor = 'rgba(0, 0, 255, 1.0)';
        fillColor = `rgba(0, 0, 255, ${OpacityValue})`;
      } else if (susceptibility === 'Flood plain') {
        // fillColor = 'rgba(217, 95, 14, 1.0)';
        fillColor = `rgba(217, 95, 14, ${OpacityValue})`;
      }

      return [
        new Style({
          stroke: new Stroke({
            color: 'black',
            width: this.boundaryThickness + 0.1, // Add thickness for blackout effect
          }),
        }),
        new Style({
          stroke: new Stroke({
            // color: this.convertToTransparent(fillColor, 0.6),
            color: fillColor,
            width: this.boundaryThickness,
            // lineDash: [2, 2],
          }),
          fill: new Fill({
            // color: this.convertToTransparent(fillColor, 0.6),
            color: fillColor,
          }),
        }),
      ];
    });
    this.reloading = false;
    this.cdr.detectChanges();
  }

  clearAllCacheData() {
    this.cacheDataService.clearAllData();
  }

  removeSuspectabilityImageVectorSource() {
    const source: VectorSource =
      this.susceptibilityVectorImageLayer.getSource();
    source!.clear();
  }

  toggleWeatherSelection() {
    this.closeWeatherSelect = !this.closeWeatherSelect;
    this.weatherSelectionOption = !this.weatherSelectionOption;
    this.showWeatherSelect = true;
    this.hideLocationSelection = '';
  }
  hideWeatherSelection() {
    this.closeWeatherSelect = false;
    this.weatherSelectionOption = false;
    this.showWeatherSelect = true;
  }

  onIframeCloseClick() {
    this.chatWindow = false;
    this.shift320 = true;
  }

  onLoadIframe() {
    this.shift320 = false;
    setTimeout(() => {
      this.chatWindowClose = true;
    }, 6000);
  }

  checkScreenSize(): void {
    this.isMobile = window.innerWidth < 768;
  }

  showHelpInfo() {
    this.hideHelpInfo = !this.hideHelpInfo;
  }

  convertToTransparent(color: string, opacity: number): string {
    const namedColors: { [key: string]: string } = {
      red1: '#eb3434',
      orange1: '#eb9b34',
      yellow1: '#e8eb34',
      green1: '#30d94f',
      red2: '#bc0019',
      red3: '#cf2129',
      red4: '#da3633',
      red5: '#e64d3e',
      orange2: '#e67743',
      yellow2: '#e1cb48',
      green2: '#87d953',
      green3: '#51d771',
      teal1: '#43cba2',
      cyan1: '#3eb6c4',
      blue1: '#479ec5',
      blue2: '#4f87c7',
      blue3: '#3d85b1',
      red6: '#f7340a',
      orange3: '#ff6c0d',
      orange4: '#ff9507',
      yellow3: '#e9cb2e',
      green4: '#63b86c',
      blue4: '#167d9c',
      blue5: '#2944be',
      darkRed1: '#ad1919',
      red7: '#df2108',
      red8: '#ff3f0a',
      orange5: '#fd5f0d',
      orange6: '#ff800e',
      orange7: '#ff9e20',
      yellow4: '#ffbb38',
      yellow5: '#ccc24f',
      green5: '#81ba63',
      teal2: '#188e93',
      blue6: '#1265a9',
      blue7: '#0c41bb',
      droughtRed: '#ff0000',
      droughtOrange: '#ffa500',
      droughtGreen: '#00cc00',
      drySpellOrange: '#ffa500',
      drySpellPeach: '#ffdab9',
      quakeDarkRed: '#880000',
      quakeRed: '#ff0000',
      quakeOrange: '#ff9100',
      quakeYellow1: '#ffdd00',
      quakeYellow2: '#ffff00',
      green6: '#7df894',
      cyan2: '#88ffff',
      blue8: '#9999ff',
      blue9: '#bfccff',
      stormRed: '#ff0000',
      stormOrange: '#ffa500',
      stormPurple: '#800080',
      floodRed: '#ff4500',
      floodOrange: '#ffbf00',
      floodBlue: '#8daee2',
      wavePurple1: '#e2c0e2',
      waveViolet: '#ee82ee',
      waveBrown1: '#b14d4d',
      waveBrown2: '#da734a',
      waveOrange: '#ebb064',
      waveYellow3: '#f1f13a',
      waveYellow4: '#f5f558',
      waveGreen1: '#4bf14b',
      waveGreen2: '#9fe176',
      waveTeal1: '#60d8ce',
      waveTeal2: '#41cbc4',
      waveBlue1: '#7aafc5',
      waveBlue2: '#4fa3c4',
      waveBlue3: '#0ca2dd',
      waveBlue4: '#0000ff',
      wavePurple2: '#6410b1',
      popDarkBlue: '#08306B',
      popBlue1: '#08519C',
      popBlue2: '#2171B5',
      popSkyBlue1: '#4292C6',
      popSkyBlue2: '#6BAED6',
      popLightBlue: '#9ECAE1',
      popBeige: '#FDD0A2',
      popOrange: '#FDAE6B',
      popRed: '#F16913',
      popDarkRed: '#D94801',
      blue: 'blue',
      land: ' #d95f0e',
      default: '#FFFFFF',
      red: 'red',
      orange: 'orange',
      yellow: 'yellow',
    };

    if (namedColors[color.toLowerCase()]) {
      color = namedColors[color.toLowerCase()];
    }

    if (color.startsWith('#')) {
      color = color.substring(1);
    }

    if (color.length === 3) {
      color = color
        .split('')
        .map((c) => c + c)
        .join('');
    }

    const r = parseInt(color.substring(0, 2), 16);
    const g = parseInt(color.substring(2, 4), 16);
    const b = parseInt(color.substring(4, 6), 16);

    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  }

  statePopulation() {
    this.opacitySection = true;
    this.fieldName = 'population';
    this.returnToOriginalMap();
    this.reloading = true;
    const existingSource: VectorSource = this.populationVectorLayer.getSource();
    existingSource?.clear();
    this.loadPOILayers('lsEWDS_1785')
      .pipe(take(1))
      .subscribe((initialItems) => {
        this.findPopulationOnLSG(initialItems);
      });
  }

  findPopulationOnLSG(populationData: any) {
    this.handleOpacity(this.formatLabelToOpacity(100));
    this.sliderControl.setValue(100);

    const colorAddedJson = populationData.map((item: any) => {
      const color = this.rangeService.getColorForPopulation(
        item?.totalpopulation
      );
      return { ...item, color };
    });
    let res = colorAddedJson.map((obj1: any) => {
      const match = this.allLsgBoundaryData.find(
        (obj2) => obj2.properties.name.toLowerCase() === obj1.name.toLowerCase()
      );
      return match
        ? {
            name: obj1.name,
            totalpopulation: obj1.totalpopulation,
            color: obj1.color,
            coordinates: match.geometry.coordinates[0],
          }
        : obj1;
    });
    this.putPopulationLsgOnMap(res);
  }

  putPopulationLsgOnMap(object: any) {
    console.log(this.opacityValue, 'this.opacityValue');
    this.populationRange = true;
    let features: Array<Feature> = [];
    for (let i = 0; i < object.length; i++) {
      const feature = object[i];
      const coords = feature.coordinates;

      const poly3857 = coords.map((coord: any) =>
        transform(coord, this.PROJECTION_EPSG_4326, this.PROJECTION_EPSG_3857)
      );

      let tempFeature: Feature = new Feature({
        name: feature.name,
        color: feature.color,
        population: feature.totalpopulation,
        geometry: new Polygon([poly3857]),
      });

      const align = 'center';
      const baseline = 'middle';
      const size = '12px';
      const height = '1';
      const weight = 'bold';
      const placement = 'point';
      const maxAngle = 45;
      const overflow = true;
      const rotation = 0;
      const font = weight + ' ' + size + '/' + height + ' ' + 'Courier New';
      const fillColor = 'black';
      const outlineColor = 'white';
      const outlineWidth = 2;

      tempFeature.setStyle((feature, resolution) => {
        const zoom = Math.round(Math.log2(156543.03392804097 / resolution));
        // const fontSize = Math.max(10, zoom * 1.2);

        return new Style({
          fill: new Fill({
            color: this.convertToTransparent(
              feature.get('color'),
              this.opacityValue
            ),
            // color: feature.get('color'),
          }),
          stroke: new Stroke({
            color: '#000',
            width: this.boundaryThickness,
          }),

          text:
            zoom >= 10
              ? new Text({
                  textAlign: align,
                  textBaseline: baseline,
                  // font: `${weight} ${fontSize}px/${height} Courier New`,
                  font: 'bold 13px "Segoe UI", "Roboto", "Open Sans", sans-serif',
                  // text: feature.get('name') + ' ' + feature.get('population'),
                  text:
                    resolution > 2500
                      ? ''
                      : `${feature.get('name')}\n👥 ${feature.get(
                          'population'
                        )}`,
                  fill: new Fill({ color: '#333' }),
                  // stroke: new Stroke({ color: outlineColor, width: outlineWidth }),
                  stroke: new Stroke({ color: '#ffffff' }),
                  placement: placement,
                  maxAngle: maxAngle,
                  overflow: overflow,
                  rotation: rotation,
                  offsetY: -30,
                })
              : undefined,
        });
      });
      features.push(tempFeature);
    }
    const source: VectorSource = this.populationVectorLayer.getSource();
    source!.clear();
    source!.addFeatures(features);

    this.reloading = false;
    this.cdr.detectChanges();
  }

  applicableDOABoundaries: any[] = ['populationLayer'];

  dynamicOpacityAdjustment() {
    const allLayers = this.map.getLayers().getArray();
    const activeVectorLayers = allLayers.filter(
      (layer) =>
        layer instanceof VectorImageLayer ||
        (layer instanceof VectorLayer &&
          layer.getVisible() &&
          layer.getSource()?.getFeatures()?.length > 0)
    ) as VectorLayer[];

    const visibleLayer = activeVectorLayers.filter((layer) =>
      layer.isVisible()
    );
    console.log(visibleLayer);
    console.log(visibleLayer[0].getSource()?.getFeatures());
  }
}
