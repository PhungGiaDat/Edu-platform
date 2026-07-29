Shader "Custom/ClayShader"
{
    Properties
    {
        _Color ("Base Color", Color) = (1, 1, 1, 1)
        _RimColor ("Rim Color", Color) = (1, 0.95, 0.9, 1)
        _RimPower ("Rim Power", Range(0.0, 5.0)) = 3.0
        _RimIntensity ("Rim Intensity", Range(0.0, 1.0)) = 0.5
    }

    SubShader
    {
        Tags { "RenderType"="Opaque" }
        LOD 100

        Pass
        {
            CGPROGRAM
            #pragma vertex vert
            #pragma fragment frag

            #include "UnityCG.cginc"

            struct appdata {
                float4 vertex : POSITION;
                float3 normal : NORMAL;
            };

            struct v2f {
                float4 pos : SV_POSITION;
                float3 worldNormal : TEXCOORD0;
                float3 worldViewDir : TEXCOORD1;
            };

            sampler2D _MainTex;
            float4 _Color;
            float4 _RimColor;
            float _RimPower;
            float _RimIntensity;

            v2f vert (appdata v) {
                v2f o;
                o.pos = UnityObjectToClipPos(v.vertex);
                o.worldNormal = UnityObjectToWorldNormal(v.normal);
                o.worldViewDir = WorldSpaceViewDir(v.vertex);
                return o;
            }

            fixed4 frag (v2f i) : SV_Target {
                fixed4 col = _Color;
                float3 normal = normalize(i.worldNormal);
                float3 viewDir = normalize(i.worldViewDir);

                // Rim light: pow(1 - dot(viewDir, normal), rimPower) * rimColor
                float rim = 1.0 - max(dot(viewDir, normal), 0.0);
                rim = pow(rim, _RimPower) * _RimIntensity;
                col.rgb += _RimColor.rgb * rim;

                return col;
            }
            ENDCG
        }
    }
}
