import { ComposableMap, Geographies, Geography } from 'react-simple-maps'
import { useState } from 'react'

const GEO_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json'

// world-atlas only provides geo.properties.name (full name), not ISO codes.
// This map converts full country names → ISO alpha-2 codes.
const NAME_TO_CODE = {
  'Afghanistan': 'AF', 'Albania': 'AL', 'Algeria': 'DZ', 'Angola': 'AO',
  'Argentina': 'AR', 'Armenia': 'AM', 'Australia': 'AU', 'Austria': 'AT',
  'Azerbaijan': 'AZ', 'Bangladesh': 'BD', 'Belarus': 'BY', 'Belgium': 'BE',
  'Benin': 'BJ', 'Bolivia': 'BO', 'Bosnia and Herz.': 'BA', 'Botswana': 'BW',
  'Brazil': 'BR', 'Bulgaria': 'BG', 'Burkina Faso': 'BF', 'Burundi': 'BI',
  'Cambodia': 'KH', 'Cameroon': 'CM', 'Canada': 'CA', 'Central African Rep.': 'CF',
  'Chad': 'TD', 'Chile': 'CL', 'China': 'CN', 'Colombia': 'CO',
  'Congo': 'CG', 'Dem. Rep. Congo': 'CD', 'Costa Rica': 'CR', 'Croatia': 'HR',
  'Cuba': 'CU', 'Cyprus': 'CY', 'Czechia': 'CZ', 'Denmark': 'DK',
  'Dominican Rep.': 'DO', 'Ecuador': 'EC', 'Egypt': 'EG', 'El Salvador': 'SV',
  'Eritrea': 'ER', 'Estonia': 'EE', 'Ethiopia': 'ET', 'Finland': 'FI',
  'France': 'FR', 'Gabon': 'GA', 'Georgia': 'GE', 'Germany': 'DE',
  'Ghana': 'GH', 'Greece': 'GR', 'Guatemala': 'GT', 'Guinea': 'GN',
  'Haiti': 'HT', 'Honduras': 'HN', 'Hungary': 'HU', 'Iceland': 'IS',
  'India': 'IN', 'Indonesia': 'ID', 'Iran': 'IR', 'Iraq': 'IQ',
  'Ireland': 'IE', 'Israel': 'IL', 'Italy': 'IT', 'Ivory Coast': 'CI',
  'Jamaica': 'JM', 'Japan': 'JP', 'Jordan': 'JO', 'Kazakhstan': 'KZ',
  'Kenya': 'KE', 'Kosovo': 'XK', 'Kuwait': 'KW', 'Kyrgyzstan': 'KG',
  'Laos': 'LA', 'Latvia': 'LV', 'Lebanon': 'LB', 'Liberia': 'LR',
  'Libya': 'LY', 'Lithuania': 'LT', 'Luxembourg': 'LU', 'Madagascar': 'MG',
  'Malawi': 'MW', 'Malaysia': 'MY', 'Mali': 'ML', 'Mauritania': 'MR',
  'Mexico': 'MX', 'Moldova': 'MD', 'Mongolia': 'MN', 'Morocco': 'MA',
  'Mozambique': 'MZ', 'Myanmar': 'MM', 'Namibia': 'NA', 'Nepal': 'NP',
  'Netherlands': 'NL', 'New Zealand': 'NZ', 'Nicaragua': 'NI', 'Niger': 'NE',
  'Nigeria': 'NG', 'North Korea': 'KP', 'North Macedonia': 'MK', 'Norway': 'NO',
  'Oman': 'OM', 'Pakistan': 'PK', 'Panama': 'PA', 'Papua New Guinea': 'PG',
  'Paraguay': 'PY', 'Peru': 'PE', 'Philippines': 'PH', 'Poland': 'PL',
  'Portugal': 'PT', 'Puerto Rico': 'PR', 'Qatar': 'QA', 'Romania': 'RO',
  'Russia': 'RU', 'Rwanda': 'RW', 'Saudi Arabia': 'SA', 'Senegal': 'SN',
  'Serbia': 'RS', 'Sierra Leone': 'SL', 'Slovakia': 'SK', 'Slovenia': 'SI',
  'Somalia': 'SO', 'Somaliland': 'SO', 'South Africa': 'ZA', 'South Korea': 'KR',
  'South Sudan': 'SS', 'Spain': 'ES', 'Sri Lanka': 'LK', 'Sudan': 'SD',
  'Sweden': 'SE', 'Switzerland': 'CH', 'Syria': 'SY', 'Taiwan': 'TW',
  'Tajikistan': 'TJ', 'Tanzania': 'TZ', 'Thailand': 'TH', 'Timor-Leste': 'TL',
  'Togo': 'TG', 'Trinidad and Tobago': 'TT', 'Tunisia': 'TN', 'Turkey': 'TR',
  'Turkmenistan': 'TM', 'Uganda': 'UG', 'Ukraine': 'UA', 'United Arab Emirates': 'AE',
  'United Kingdom': 'GB', 'United States of America': 'US', 'Uruguay': 'UY',
  'Uzbekistan': 'UZ', 'Venezuela': 'VE', 'Vietnam': 'VN', 'W. Sahara': 'EH',
  'Yemen': 'YE', 'Zambia': 'ZM', 'Zimbabwe': 'ZW',
}

export default function GeoHeatmap({ countries = [] }) {
  const [tooltipContent, setTooltipContent] = useState('')

  // Build lookup: ISO alpha-2 code → clicks
  const clickMap = {}
  let maxClicks = 0
  for (const c of countries) {
    if (c.countryCode && c.countryCode !== 'XX') {
      clickMap[c.countryCode] = c.clicks
      if (c.clicks > maxClicks) maxClicks = c.clicks
    }
  }

  function getColor(isoCode) {
    const clicks = clickMap[isoCode] || 0
    if (!clicks) return '#1E1E2E'
    const intensity = Math.min(1, clicks / Math.max(1, maxClicks))
    const r = Math.round(45 + intensity * (124 - 45))
    const g = Math.round(26 + intensity * (58 - 26))
    const b = Math.round(94 + intensity * (237 - 94))
    return `rgb(${r},${g},${b})`
  }

  // Filter out Unknown entries for the table
  const knownCountries = countries.filter(c => c.countryCode && c.countryCode !== 'XX')

  return (
    <div style={{ position: 'relative' }}>
      <ComposableMap
        projection="geoNaturalEarth1"
        style={{ background: 'transparent', width: '100%', height: 'auto' }}
      >
        <Geographies geography={GEO_URL}>
          {({ geographies }) =>
            geographies.map((geo) => {
              const isoCode = NAME_TO_CODE[geo.properties.name] || ''
              const clicks = clickMap[isoCode] || 0
              return (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  fill={getColor(isoCode)}
                  stroke="#0A0A0F"
                  strokeWidth={0.5}
                  style={{
                    default: { outline: 'none' },
                    hover: { fill: '#A78BFA', outline: 'none', cursor: 'pointer' },
                    pressed: { outline: 'none' },
                  }}
                  onMouseEnter={() => {
                    if (clicks > 0) {
                      setTooltipContent(`${geo.properties.name}: ${clicks.toLocaleString()} clicks`)
                    } else {
                      setTooltipContent(geo.properties.name)
                    }
                  }}
                  onMouseLeave={() => setTooltipContent('')}
                />
              )
            })
          }
        </Geographies>
      </ComposableMap>

      {tooltipContent && (
        <div style={{
          position: 'absolute', bottom: '10px', left: '50%', transform: 'translateX(-50%)',
          background: 'var(--card)', border: '1px solid var(--border)',
          padding: '6px 14px', borderRadius: '6px', fontSize: '13px', pointerEvents: 'none',
          color: 'var(--text)', whiteSpace: 'nowrap',
        }}>
          {tooltipContent}
        </div>
      )}

      {knownCountries.length > 0 && (
        <div style={{ marginTop: '20px' }}>
          <p style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Top Countries
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {knownCountries.slice(0, 10).map((c, i) => {
              const pct = maxClicks ? ((c.clicks / maxClicks) * 100).toFixed(0) : 0
              return (
                <div key={c.countryCode} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ color: 'var(--muted)', fontSize: '12px', width: '16px' }}>{i + 1}</span>
                  <span style={{ fontSize: '16px' }}>{countryFlag(c.countryCode)}</span>
                  <span style={{ flex: 1, fontSize: '13px' }}>{c.country || c.countryCode}</span>
                  <div style={{ width: '80px', height: '4px', background: 'var(--border)', borderRadius: '2px' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: 'var(--primary)', borderRadius: '2px' }} />
                  </div>
                  <span style={{ color: 'var(--muted)', fontSize: '12px', width: '50px', textAlign: 'right' }}>
                    {c.clicks.toLocaleString()}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

function countryFlag(code) {
  if (!code || code.length !== 2) return '🌐'
  const codePoints = [...code.toUpperCase()].map(c => 0x1F1E6 + c.charCodeAt(0) - 65)
  return String.fromCodePoint(...codePoints)
}
