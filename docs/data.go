package docs

import (
	"fmt"
	"reflect"
	"strings"

	"github.com/strimertul/strimertul/docs/interfaces"
)

type DataObject struct {
	Name        string       `json:"name"`
	Description string       `json:"description,omitempty"`
	Kind        Kind         `json:"kind"`
	Keys        []DataObject `json:"keys,omitempty"`
	Key         *DataObject  `json:"key,omitempty"`
	Element     *DataObject  `json:"element,omitempty"`
	EnumValues  []string     `json:"enumValues,omitempty"`
	IsPointer   bool         `json:"isPointer,omitempty"`
}

type KeyObject struct {
	Description string              `json:"description"`
	Schema      DataObject          `json:"schema"`
	Tags        []interfaces.KeyTag `json:"tags,omitempty"`
}

type Kind string

const (
	KindString  Kind = "string"
	KindInt     Kind = "int"
	KindFloat   Kind = "float"
	KindStruct  Kind = "object"
	KindBoolean Kind = "boolean"
	KindEnum    Kind = "enum"
	KindUnknown Kind = "unknown"
	KindArray   Kind = "array"
	KindDict    Kind = "dictionary"
	KindDate    Kind = "datetime"
)

func getKind(typ reflect.Kind) Kind {
	switch typ {
	case reflect.Int, reflect.Int8, reflect.Int16, reflect.Int32, reflect.Int64, reflect.Uint, reflect.Uint8, reflect.Uint16, reflect.Uint32, reflect.Uint64, reflect.Uintptr:
		return KindInt
	case reflect.Float32, reflect.Float64:
		return KindFloat
	case reflect.String:
		return KindString
	case reflect.Bool:
		return KindBoolean
	case reflect.Struct:
		return KindStruct
	case reflect.Map:
		return KindDict
	case reflect.Array, reflect.Slice:
		return KindArray
	}
	return KindUnknown
}

func parseType(typ reflect.Type) (out DataObject) {
	out.Name = typ.Name()

	// Check for common complex types
	switch typ.String() {
	case "time.Time":
		out.Kind = KindDate
		return
	}

	// Check for known enums
	if enum, ok := Enums[out.Name]; ok {
		out.Kind = KindEnum
		for _, it := range enum.Values {
			out.EnumValues = append(out.EnumValues, fmt.Sprint(it))
		}
		return
	}

	// Dereference pointers
	for typ.Kind() == reflect.Pointer {
		out.IsPointer = true
		typ = typ.Elem()
	}

	out.Kind = getKind(typ.Kind())

	switch out.Kind {
	case KindStruct:
		out.Keys = parseStruct(typ)
	case KindArray, KindDict:
		elem := parseType(typ.Elem())
		out.Element = &elem
		if out.Kind == KindDict {
			key := parseType(typ.Key())
			out.Key = &key
		}
	}

	return
}

func parseStruct(typ reflect.Type) (out []DataObject) {
	for index := 0; index < typ.NumField(); index++ {
		field := typ.Field(index)
		obj := parseType(field.Type)
		if jsonName, ok := field.Tag.Lookup("json"); ok {
			parts := strings.SplitN(jsonName, ",", 2)
			obj.Name = parts[0]
		} else {
			obj.Name = field.Name
		}
		obj.Description = field.Tag.Get("desc")
		out = append(out, obj)
	}
	return out
}
